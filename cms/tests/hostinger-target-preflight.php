<?php
declare(strict_types=1);
// Public Stage2 probe contract: tests its actual standalone artifact, never a host.
$probe=realpath(__DIR__.'/../hosting/hostinger-readonly/index.php');
if ($probe === false) {fwrite(STDERR, "probe_missing\n");exit(1);}
$checks=0;
function runProbe(string $probe,string $method,string $uri, ?string $script = null):string {
    $code='$_SERVER["REQUEST_METHOD"]='.var_export($method,true).';'
        .'$_SERVER["REQUEST_URI"]='.var_export($uri,true).';'
        .'$_SERVER["DOCUMENT_ROOT"]='.var_export(dirname($probe),true).';'
        .'$_SERVER["SCRIPT_FILENAME"]='.var_export($script ?? $probe,true).';'
        .'include '.var_export($probe,true).';';
    $cmd=escapeshellarg(PHP_BINARY).' -r '.escapeshellarg($code);
    $parts=[];$exit=0;
    exec($cmd.' 2>&1',$parts,$exit);
    if($exit!==0)throw new RuntimeException("probe_subprocess_failed");
    return implode("\n",$parts);
}
function passes(bool $valid,string $name):void {
    global $checks;
    if (!$valid)throw new RuntimeException($name);
    $checks++;
}
$body=runProbe($probe,'GET','/__stage2/host');
$data=json_decode($body,true,512,JSON_THROW_ON_ERROR);
passes($data['format']==='ai-site-cms-stage2-target-php-preflight-v1','format');
passes($data['probeRevision']==='stage2-target-host-check-20261020-r8'&&$data['observationOnly']===true,'revision');
passes($data['phpVersionMajorMinor']===PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,'phpVersion');
passes($data['phpSapi']===PHP_SAPI,'actualSapi');
passes(is_bool($data['requirements']['privateParentExistsAndReadable'])
    &&is_bool($data['requirements']['privateParentAppearsWritable']), 'private-parent-observation-not-proof');
passes($data['stage2Accepted']===false&&$data['stage3Authorized']===false
    &&$data['productionReady']===false&&$data['cmsInstalled']===false,'not_approved');
passes($data['databaseConnectionAttempted']===false
    &&$data['privateFilesystemVerified']===false
    &&$data['cmsVisitorOutageTested']===false,'no_fake_host_checks');
passes(is_array($data['requirements'])&&array_key_exists('php81OrLater',$data['requirements'])
    &&array_key_exists('webSapi',$data['requirements']),'required_shapes');
passes($data['requirements']['documentRootMatchesPublicEntrypoint']===true,'root_check');
passes(strpos($body,dirname(__DIR__))===false && strpos($body,'password')===false
    && strpos($body,'u235811320')===false,'no_paths_or_secrets');
passes(str_contains(runProbe($probe,'GET','/__stage2/rewrite/proof'),'"frontControllerMapped":true'),
    'router_front_controller_mapping');
passes(str_contains(runProbe($probe,'GET','/__stage2/rewrite/proof',$probe.'-wrong'),'"frontControllerMapped":false'),
    'router_wrong_executable_refused');
passes(str_contains(runProbe($probe,'GET','/__stage2/private-boundary'),'"outsideThisPublicRootMarkerObserved":false'),
    'private_boundary_not_fabricated');
$base = sys_get_temp_dir().'/stage2-private-marker-'.bin2hex(random_bytes(5));
mkdir($base,0700);
mkdir($base.'/public_html',0700);
mkdir($base.'/cms-stage2-private-boundary',0700);
$copied = $base.'/public_html/index.php';
try {
    copy($probe,$copied);
    $marker = "{\"format\":\"ai-site-cms-stage2-private-boundary-marker-v1\",\"purpose\":\"test-only-no-code-no-secrets\",\"deploymentFolder\":\"cms-stage2-private-boundary\"}".chr(10);
    file_put_contents($base.'/cms-stage2-private-boundary/probe.json',$marker);
    passes(str_contains(runProbe($copied,'GET','/__stage2/private-boundary'),'"outsideThisPublicRootMarkerObserved":true'),
        'real_sibling_folder_marker_detected');
    passes(str_contains(runProbe($copied,'GET','/cms-stage2-private-boundary/probe.json'),'not_found'),
        'no_http_exposure_via_front_controller');
} finally {
    @unlink($base.'/cms-stage2-private-boundary/probe.json');
    @unlink($copied);
    @rmdir($base.'/cms-stage2-private-boundary');
    @rmdir($base.'/public_html');
    @rmdir($base);
}

passes(str_contains(runProbe($probe,'GET','/__stage2/kernel/smoke'),'"result":"not_ready"'),
    'unsigned_kernel_smoke_missing_package_fails_closed');
passes(str_contains(runProbe($probe,'GET','/__stage2/offweb-package'),'"state":"absent"'),
    'missing_offweb_package');
$base=sys_get_temp_dir().'/stage2-offweb-'.bin2hex(random_bytes(6));
mkdir($base,0700);mkdir($base.'/public_html',0700);
$copy=$base.'/public_html/index.php';copy($probe,$copy);
$root=$base.'/cms-stage2-offweb-runtime';mkdir($root,0700);
$paths=['public/index.php','public/.htaccess','vendor/autoload.php','private/editor/editor.js'];
for($i=0;$i<16;$i++)$paths[]='src/Test/Item'.$i.'.php';
try {
    $entries=[];
    foreach($paths as $rel) {
        $f=$root.'/'.$rel;
        if(!is_dir(dirname($f)))mkdir(dirname($f),0700,true);
        $body='INERT-CONTENTS:'.$rel.chr(10);
        file_put_contents($f,$body);
        $entries[]=['path'=>$rel,'bytes'=>strlen($body),'sha256'=>hash('sha256',$body)];
    }
    $meta=['format'=>'ai-site-cms-internal-stage2-v2','stage'=>2,
        'documentRoot'=>'public','productionReady'=>false,'isSigned'=>false,
        'writeEndpointsAvailable'=>false,'files'=>$entries];
    file_put_contents($root.'/private/package-manifest.json',
        json_encode($meta,JSON_THROW_ON_ERROR));
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='verified_unsigned_package'&&$a['verifiedFiles']===20
        &&$a['manifestSha256']===hash_file('sha256',$root.'/private/package-manifest.json')
        &&$a['offwebPackageIntegrityVerified']===true
        &&$a['phpFromPackageExecuted']===false&&$a['cmsInstalled']===false,
        'full_unsigned_offweb_package_detected');
    // Extra PHP must block even the health-only vendor boot.
    $extra=$root.'/vendor/undocumented.php';
    file_put_contents($extra,'<?php throw new Exception("should never load");');
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='incomplete'&&!$a['offwebPackageIntegrityVerified']
        &&$a['verifiedFiles']===0,'unlisted_vendor_code_refused');
    passes(str_contains(runProbe($copy,'GET','/__stage2/kernel/smoke'),
        '"realSlimKernelHealthPassed":false'),'extra_php_blocks_vendor_boot');
    unlink($extra);
    $secret=$root.'/private/.env';
    file_put_contents($secret,'TEST_ONLY_NOT_A_SECRET');
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='incomplete','hidden_private_state_refused');
    unlink($secret);
    $link=$root.'/vendor/foreign';
    symlink($root.'/public',$link);
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='incomplete','package_symlink_refused');
    unlink($link);
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='verified_unsigned_package'&&$a['verifiedFiles']===20,
        'clean_fixture_recovers');
    file_put_contents($root.'/public/index.php','tampered');
    $a=json_decode(runProbe($copy,'GET','/__stage2/offweb-package'),true,16,JSON_THROW_ON_ERROR);
    passes($a['state']==='incomplete'&&!$a['offwebPackageIntegrityVerified'],
        'tampered_offweb_package_refused');
    passes(str_contains(runProbe($copy,'GET',
        '/cms-stage2-offweb-runtime/private/package-manifest.json'),'not_found'),
        'private_manifest_not_exposed_by_controller');
} finally {
    foreach($paths as $rel)@unlink($root.'/'.$rel);
    @unlink($root.'/private/package-manifest.json');
    foreach(['src/Test','src','private/editor','private','public','vendor'] as $d)
        @rmdir($root.'/'.$d);
    @rmdir($root);@unlink($copy);@rmdir($base.'/public_html');@rmdir($base);
}
passes(str_contains(runProbe($probe,'GET','/api/health'),'not_installed'),'not_installed_health');
passes(str_contains(runProbe($probe,'GET','/api/publish'),'not_found'),'no_publish');
passes(str_contains(runProbe($probe,'POST','/__stage2/host'),'method_not_allowed'),'get_only');
passes(str_contains(runProbe($probe,'GET','/'),'NOT an installed CMS'),'root_explicit_warning');
passes(str_contains(runProbe($probe,'GET','/index.php?debug=1'),'not_found'),'no_debug');
passes(str_contains(runProbe($probe,'GET','/.env'),'not_found'),'dotfile_not_routed');
passes(is_file(__DIR__.'/../hosting/hostinger-readonly/.htaccess'),'webserver_rules_present');
$rules=file_get_contents(__DIR__.'/../hosting/hostinger-readonly/.htaccess');
passes(is_string($rules)&&str_contains($rules, 'RewriteRule (^|/)\\. - [F,L]'),
    'hidden_git_and_dotfiles_explicitly_forbidden');
echo "Stage2 Hostinger read-only PHP preflight: $checks checks PASS (NO HOST ACCESS)\n";
