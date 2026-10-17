<?php
/* Research-only PHP shared-hosting-style public renderer. Not AI Site CMS code. */
declare(strict_types=1);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$path=parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!in_array($path, ['/', '/index.php'], true)) {
  http_response_code(404);header('Content-Type: text/plain; charset=UTF-8');echo 'Not Found';exit;
}
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET','HEAD'], true)) {
  http_response_code(405);header('Allow: GET, HEAD');echo 'Method Not Allowed';exit;
}
$file=getenv('STAGE1_PUBLISHED_FIXTURE');
if (!is_string($file)||!is_file($file)||!is_readable($file)) {
  http_response_code(503);header('Content-Type: text/plain; charset=UTF-8');echo 'Missing published snapshot';exit;
}
try {
  $data=json_decode(file_get_contents($file),false,16,JSON_THROW_ON_ERROR);
  if (!is_object($data) ||
      !isset($data->title,$data->fontSize,$data->accent,$data->cta) ||
      !is_string($data->title)||strlen($data->title)>500 ||
      !is_string($data->cta)||strlen($data->cta)>200 ||
      !is_string($data->fontSize)||!preg_match('/^[0-9]{1,3}px$/D',$data->fontSize) ||
      !is_string($data->accent)||!preg_match('/^#[0-9a-fA-F]{6}$/D',$data->accent)) {
    throw new UnexpectedValueException('Invalid published snapshot');
  }
} catch (Throwable $e) {
  http_response_code(503);header('Content-Type: text/plain; charset=UTF-8');echo 'Published snapshot invalid';exit;
}
$s=static fn (string $v):string=>htmlspecialchars($v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
header('Content-Type: text/html; charset=UTF-8');
?><!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PHP fixture</title>
<style>:root{color-scheme:dark}body{margin:0;color:white;background:#0b1013;font-family:system-ui,sans-serif}main{padding:32px;display:grid;grid-template-columns:1fr 1fr;gap:30px;min-height:360px}h1{font-size:<?= $s($data->fontSize) ?>;line-height:1.1}button{background:<?= $s($data->accent) ?>;padding:16px 28px;border:0;border-radius:999px}@media(max-width:800px){main{grid-template-columns:1fr}}</style>
</head><body><main id="hero"><section><h1 id="title"><?= $s($data->title) ?></h1><button id="cta"><?= $s($data->cta) ?></button></section><aside>Published artifact only; no admin process or client editor runtime</aside></main></body></html>
