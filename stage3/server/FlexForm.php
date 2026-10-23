<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;

/** One closed, versioned form-builder vocabulary. Legacy lead-form unchanged. */
final class FlexForm
{
    private const SLOTS = ['extra-one', 'extra-two', 'extra-three'];
    private const TYPES = ['off','text','tel','select','textarea'];

    private static function element(array $section, string $slot): array
    {
        foreach ($section['elements'] as $el) {
            if ($el['slot'] === $slot) return $el['values'];
        }
        throw new InvalidArgumentException('Missing form slot');
    }

    /** Deterministic by immutable published section: no visitor-supplied schema. */
    public static function definitions(array $section): array
    {
        if ($section['component'] !== 'lead-form-flex') return [];
        $result = [];
        foreach (self::SLOTS as $i => $slot) {
            $values = self::element($section, $slot);
            $kind = $values['behavior.kind'] ?? null;
            $required = $values['behavior.required'] ?? null;
            $title = $values['content.text'] ?? null;
            $optionsText = $values['content.options'] ?? null;
            if (!in_array($kind, self::TYPES, true) || !is_bool($required)
                || !is_string($title) || trim($title) === ''
                || !is_string($optionsText)) {
                throw new InvalidArgumentException('Invalid form configuration');
            }
            if ($kind === 'off') continue;
            $options = [];
            if ($kind === 'select') {
                $options = array_map('trim', preg_split('/\r?\n/', $optionsText));
                if (count($options) < 2 || count($options) > 12
                    || count(array_unique($options)) !== count($options)) {
                    throw new InvalidArgumentException('Select requires 2 to 12 unique options');
                }
                foreach ($options as $option) {
                    if ($option === '' || strlen($option) > 80 || str_contains($option, "\0")) {
                        throw new InvalidArgumentException('Invalid select option');
                    }
                }
            }
            $result[] = ['name'=>'extra'.($i+1),'label'=>$title,'kind'=>$kind,
                'required'=>$required,'options'=>$options];
        }
        return $result;
    }

    /** Server-side extra input validation; rejects unexpected inputs, arrays and spoofed options. */
    public static function read(array $section, array $payload): array
    {
        $result = [];
        foreach (self::definitions($section) as $field) {
            $name = $field['name'];
            $raw = $payload[$name] ?? '';
            if (!is_string($raw) || !preg_match('//u', $raw)) {
                throw new InvalidArgumentException('Invalid additional form field');
            }
            $value = trim($raw);
            $max = $field['kind'] === 'textarea' ? 1000 : 180;
            if (strlen($value) > $max
                || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
                throw new InvalidArgumentException('Additional field too long');
            }
            if ($field['required'] && $value === '') {
                throw new InvalidArgumentException('Required additional field missing');
            }
            if ($value !== '' && $field['kind'] === 'tel'
                && !preg_match('/^[+0-9()\-\s]{7,32}$/D', $value)) {
                throw new InvalidArgumentException('Invalid phone field');
            }
            if ($value !== '' && $field['kind'] === 'select'
                && !in_array($value, $field['options'], true)) {
                throw new InvalidArgumentException('Unexpected select option');
            }
            $result[$name] = ['label'=>$field['label'],'value'=>$value];
        }
        return $result;
    }

    public static function allowedNames(array $section): array
    {
        return array_column(self::definitions($section), 'name');
    }
}
