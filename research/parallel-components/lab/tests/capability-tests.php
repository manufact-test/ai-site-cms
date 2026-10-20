<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/CapabilityGate.php';
$registry = json_decode(file_get_contents(__DIR__.'/../../fixtures/block-capabilities.research.json'), true, 512, JSON_THROW_ON_ERROR);
$checks=0;
function expectPatch(bool $expected, array $patch): void {
    global $registry, $checks;
    ++$checks;
    $actual = CapabilityGate::accepts($registry, $patch, 'example.test');
    if ($actual !== $expected) throw new RuntimeException('Candidate patch gate mismatch: '.json_encode($patch));
}
expectPatch(true, ['blockId'=>'hero-primary','changes'=>['content.heading'=>'New headline']]);
expectPatch(true, ['blockId'=>'hero-primary','changes'=>['media.assetId'=>null]]);
expectPatch(true, ['blockId'=>'hero-primary','changes'=>['action.href'=>'/contact']]);
expectPatch(true, ['blockId'=>'faq-delivery','changes'=>['behavior.expandedInitially'=>true]]);
expectPatch(true, ['blockId'=>'contact-form','changes'=>['action.label'=>'Send request']]);
expectPatch(false, ['blockId'=>'missing','changes'=>['content.heading'=>'New']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['behavior.expandedInitially'=>true]]);
expectPatch(false, ['blockId'=>'faq-delivery','changes'=>['media.assetId'=>'asset_12345678']]);
expectPatch(false, ['blockId'=>'contact-form','changes'=>['action.href'=>'https://example.test']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['action.href'=>'javascript:alert(1)']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['action.href'=>'https://evil.test']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['content.heading'=>'']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['style.textPreset'=>'expression(alert(1))']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['media.assetId'=>'/uploads/file.svg']]);
expectPatch(false, ['blockId'=>'faq-delivery','changes'=>['behavior.expandedInitially'=>'false']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['content.heading'=>['HTML'=>'<script>']]]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['content.heading'=>'A'], 'developer'=>true]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>[]]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['action.href'=>'/percent%2Fencoded']]);
expectPatch(false, ['blockId'=>'hero-primary','changes'=>['content.heading'=>"\xC3\x28"]]);
echo "CapabilityGate PASS: $checks explicit block-specific value checks\n";
