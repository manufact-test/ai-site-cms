<?php
declare(strict_types=1);

require_once __DIR__ . '/VideoGuard.php';
require_once __DIR__ . '/DesignGraph.php';
require_once __DIR__ . '/ContractValidator.php';
require_once __DIR__ . '/SiteArchives.php';
require_once __DIR__ . '/AccessControl.php';
require_once __DIR__ . '/Licenses.php';
require_once __DIR__ . '/FormDelivery.php';
require_once __DIR__ . '/LeadWorkflow.php';
require_once __DIR__ . '/CrossSiteTransfer.php';
require_once __DIR__ . '/CrossSiteCollections.php';
require_once __DIR__ . '/PageHistory.php';
require_once __DIR__ . '/VideoUploads.php';
require_once __DIR__ . '/SiteRepository.php';
require_once __DIR__ . '/PublicRenderer.php';
require_once __DIR__ . '/FlexForm.php';
require_once __DIR__ . '/FormGateway.php';
require_once __DIR__ . '/Api.php';

use Manufact\Stage3\ContractValidator;
use Manufact\Stage3\SiteRepository;

function stage3_repository(): SiteRepository
{
    $dsn = getenv('STAGE3_DSN');
    if ($dsn === false || !preg_match('/^(sqlite:|mysql:)/', $dsn)) {
        throw new RuntimeException('Explicit isolated STAGE3_DSN is required');
    }
    $pdo = new PDO($dsn, getenv('STAGE3_DB_USER') ?: null,
        getenv('STAGE3_DB_PASSWORD') ?: null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    return new SiteRepository($pdo, new ContractValidator(__DIR__ . '/../components'));
}
