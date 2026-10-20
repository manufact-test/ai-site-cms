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
passes($data['probeRevision']==='stage2-target-host-check-20261020-r3'&&$data['observationOnly']===true,'revision');
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
