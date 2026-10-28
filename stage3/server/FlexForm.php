<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;

/**
 * Closed, versioned builder vocabulary. Legacy lead-form and its three original
 * slots remain byte-compatible. New fields are opt-in and release-immutable.
 */
final class FlexForm
{
    private const SLOTS = ['extra-one', 'extra-two', 'extra-three'];
    private const TYPES = ['text','tel','email','select','textarea','radio','checkbox','number','date','url'];

    private static function element(array $section, string $slot): array
    {
        foreach ($section['elements'] as $el) {
            if ($el['slot'] === $slot) return $el['values'];
        }
        throw new InvalidArgumentException('Missing form slot');
    }

    private static function options(array $raw): array
    {
        if (count($raw) < 2 || count($raw) > 12 || count(array_unique($raw)) !== count($raw)) {
            throw new InvalidArgumentException('Choice field requires 2–12 unique options');
        }
        foreach ($raw as $option) {
            if (!is_string($option) || trim($option) === '' || strlen($option) > 80
                || preg_match('//u', $option) !== 1 || preg_match('/[\x00-\x1f]/', $option)) {
                throw new InvalidArgumentException('Invalid select option');
            }
        }
        return $raw;
    }

    /** Deterministic from an immutable published section, never from POST fields. */
    public static function definitions(array $section): array
    {
        if ($section['component'] !== 'lead-form-flex') {
            if (array_key_exists('formFields', $section)) {
                throw new InvalidArgumentException('Only flexible forms can declare formFields');
            }
            return [];
        }
        $result = [];
        $selects = [];
        foreach (self::SLOTS as $i => $slot) {
            $values = self::element($section, $slot);
            $kind = $values['behavior.kind'] ?? null;
            $required = $values['behavior.required'] ?? null;
            $title = $values['content.text'] ?? null;
            $optionsText = $values['content.options'] ?? null;
            if (!in_array($kind, ['off','text','tel','select','textarea'], true) || !is_bool($required)
                || !is_string($title) || trim($title) === '' || !is_string($optionsText)) {
                throw new InvalidArgumentException('Invalid form configuration');
            }
            if ($kind === 'off') continue;
            $options = $kind === 'select'
                ? self::options(array_map('trim', preg_split('/\r?\n/', $optionsText))) : [];
            $name = 'extra' . ($i + 1);
            $result[] = ['name'=>$name,'label'=>$title,'kind'=>$kind,
                'required'=>$required,'options'=>$options,'placeholder'=>'','when'=>null];
            if ($kind === 'select') $selects[$name] = $options;
        }
        $fields = $section['formFields'] ?? [];
        if (!is_array($fields) || !array_is_list($fields) || count($fields) > 9) {
            throw new InvalidArgumentException('Invalid form builder field list');
        }
        $seen = [];
        foreach ($fields as $field) {
            if (!is_array($field) || count(array_diff(array_keys($field),
                ['id','label','kind','required','options','placeholder','when'])) ||
                count(array_diff(['id','label','kind','required','options','placeholder'], array_keys($field)))) {
                throw new InvalidArgumentException('Invalid form field keys');
            }
            $name = $field['id'];
            if (!is_string($name) || preg_match('/^field-[a-z][a-z0-9-]{2,49}$/D', $name) !== 1
                || isset($seen[$name])) {
                throw new InvalidArgumentException('Duplicate or invalid field identity');
            }
            $seen[$name] = true;
            $label = $field['label'];
            $kind = $field['kind'];
            $placeholder = $field['placeholder'];
            if (!is_string($label) || trim($label) === '' || strlen($label) > 100
                || preg_match('//u', $label) !== 1 || preg_match('/[\x00-\x1f]/', $label)
                || !in_array($kind, self::TYPES, true)
                || !is_bool($field['required']) || !is_string($placeholder)
                || strlen($placeholder) > 120 || preg_match('//u', $placeholder) !== 1
                || preg_match('/[\x00-\x1f]/', $placeholder)
                || !is_array($field['options']) || !array_is_list($field['options'])) {
                throw new InvalidArgumentException('Invalid form field definition');
            }
            if (in_array($kind, ['select','radio'], true)) $options = self::options($field['options']);
            else {
                if ($field['options'] !== []) throw new InvalidArgumentException('Options require a select');
                $options = [];
            }
            $when = $field['when'] ?? null;
            if (array_key_exists('when',$field)) {
                if (!is_array($when) || count($when) !== 2 || !array_key_exists('field',$when)
                    || !array_key_exists('option',$when)
                    || !is_string($when['field']) || !isset($selects[$when['field']])
                    || !is_int($when['option']) || $when['option'] < 1
                    || $when['option'] > count($selects[$when['field']])) {
                    throw new InvalidArgumentException('Condition must target a preceding select');
                }
            }
            $result[] = ['name'=>$name,'label'=>$label,'kind'=>$kind,
                'required'=>$field['required'],'options'=>$options,
                'placeholder'=>$placeholder,'when'=>$when];
            if ($kind === 'select') $selects[$name] = $options;
        }
        return $result;
    }

    /** Optional step partitions are presentation only; POST remains one atomic request. */
    public static function steps(array $section): array
    {
        if (!array_key_exists('formSteps', $section)) return [];
        if ($section['component'] !== 'lead-form-flex') {
            throw new InvalidArgumentException('Form steps require a flexible form');
        }
        $steps = $section['formSteps'];
        if (!is_array($steps) || !array_is_list($steps)
            || count($steps) < 2 || count($steps) > 4) {
            throw new InvalidArgumentException('Form requires two to four steps');
        }
        $definitions = self::definitions($section);
        $available = ['name'=>true, 'email'=>true, 'message'=>true];
        $dependencies = [];
        foreach ($definitions as $field) {
            $available[$field['name']] = true;
            if ($field['when'] !== null) {
                $dependencies[$field['name']] = $field['when']['field'];
            }
        }
        $seen = []; $positions = [];
        foreach ($steps as $index => $step) {
            if (!is_array($step) || count(array_diff(array_keys($step), ['title','fields']))
                || count(array_diff(['title','fields'], array_keys($step)))
                || !is_string($step['title']) || trim($step['title']) === ''
                || strlen($step['title']) > 60 || preg_match('//u', $step['title']) !== 1
                || preg_match('/[\x00-\x1f]/', $step['title'])
                || !is_array($step['fields']) || !array_is_list($step['fields'])
                || count($step['fields']) < 1 || count($step['fields']) > 15) {
                throw new InvalidArgumentException('Invalid form step');
            }
            foreach ($step['fields'] as $name) {
                if (!is_string($name) || !isset($available[$name]) || isset($seen[$name])) {
                    throw new InvalidArgumentException('Unknown or duplicate form step field');
                }
                $seen[$name] = true;
                $positions[$name] = $index;
            }
        }
        if (count($seen) !== count($available)) {
            throw new InvalidArgumentException('Form steps must cover all fields once');
        }
        foreach ($dependencies as $field => $source) {
            if ($positions[$source] > $positions[$field]) {
                throw new InvalidArgumentException('Conditional field precedes its source step');
            }
        }
        return $steps;
    }

    /** Visitor values are validated against the exact published schema. */
    public static function read(array $section, array $payload): array
    {
        $result = [];
        $valuesByName = [];
        foreach (self::definitions($section) as $field) {
            $name = $field['name'];
            $raw = $payload[$name] ?? '';
            if (!is_string($raw) || preg_match('//u', $raw) !== 1) {
                throw new InvalidArgumentException('Invalid additional form field');
            }
            $value = trim($raw);
            $max = match ($field['kind']) {
                'textarea' => 1000, 'email' => 254, 'tel' => 32,
                'date' => 10, 'number' => 64, 'url' => 2048, 'checkbox' => 3,
                default => 180,
            };
            if (strlen($value) > $max || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) {
                throw new InvalidArgumentException('Additional field too long');
            }
            $active = true;
            if ($field['when'] !== null) {
                $source = $field['when']['field'];
                $expected = self::selectedOption(self::definitions($section), $source, $field['when']['option']);
                $active = ($valuesByName[$source] ?? '') === $expected;
            }
            if (!$active) {
                if ($value !== '') throw new InvalidArgumentException('Inactive conditional field supplied');
                $valuesByName[$name] = '';
                continue;
            }
            if ($field['required'] && $value === '') {
                throw new InvalidArgumentException('Required additional field missing');
            }
            if ($value !== '' && $field['kind'] === 'tel'
                && !preg_match('/^[+0-9()\-\s]{7,32}$/D', $value)) {
                throw new InvalidArgumentException('Invalid phone field');
            }
            if ($value !== '' && $field['kind'] === 'email' && !filter_var($value,FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Invalid email field');
            }
            if ($value !== '' && in_array($field['kind'], ['select','radio'], true)
                && !in_array($value, $field['options'], true)) {
                throw new InvalidArgumentException('Unexpected choice option');
            }
            if ($value !== '' && $field['kind'] === 'checkbox' && $value !== 'yes') {
                throw new InvalidArgumentException('Invalid checkbox value');
            }
            if ($value !== '' && $field['kind'] === 'number'
                && preg_match('/^-?(?:0|[1-9][0-9]{0,11})(?:\\.[0-9]{1,4})?$/D', $value) !== 1) {
                throw new InvalidArgumentException('Invalid number field');
            }
            if ($value !== '' && $field['kind'] === 'date') {
                if (preg_match('/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/D', $value, $date) !== 1
                    || !checkdate((int)$date[2], (int)$date[3], (int)$date[1])) {
                    throw new InvalidArgumentException('Invalid date field');
                }
            }
            if ($value !== '' && $field['kind'] === 'url') {
                $scheme = strtolower((string)parse_url($value, PHP_URL_SCHEME));
                if (!in_array($scheme, ['http','https'], true) || filter_var($value, FILTER_VALIDATE_URL) === false) {
                    throw new InvalidArgumentException('Invalid URL field');
                }
            }
            $valuesByName[$name] = $value;
            $result[$name] = ['label'=>$field['label'],'value'=>$value];
        }
        return $result;
    }

    private static function selectedOption(array $definitions, string $name, int $ordinal): string
    {
        foreach ($definitions as $definition) {
            if ($definition['name'] === $name) return $definition['options'][$ordinal - 1];
        }
        throw new InvalidArgumentException('Missing conditional select');
    }

    public static function allowedNames(array $section): array
    {
        return array_column(self::definitions($section), 'name');
    }
}
