<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use PDOException;
use Throwable;

/** Per-site optional email/Telegram delivery. Secrets remain in process env. */
trait FormDelivery
{
    private function deliverySchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return [
            "CREATE TABLE stage3_delivery_settings (site_id $id PRIMARY KEY, email_enabled INTEGER NOT NULL, email_recipient VARCHAR(254) NOT NULL, telegram_enabled INTEGER NOT NULL, telegram_chat_id VARCHAR(32) NOT NULL, version INTEGER NOT NULL, operator $id NOT NULL, reason VARCHAR(240) NOT NULL, changed_at VARCHAR(35) NOT NULL)$tail",
            "CREATE TABLE stage3_delivery_outbox (delivery_id $id PRIMARY KEY, site_id $id NOT NULL, submission_id $id NOT NULL, channel VARCHAR(16) NOT NULL, state VARCHAR(32) NOT NULL, attempts INTEGER NOT NULL, created_at VARCHAR(35) NOT NULL, updated_at VARCHAR(35) NOT NULL, accepted_at VARCHAR(35) NULL, last_error VARCHAR(64) NULL, target VARCHAR(254) NOT NULL DEFAULT '', UNIQUE(site_id,submission_id,channel))$tail",
            ...$this->deliveryRouteSchema()
        ];
    }

    public function upgradeDeliverySchema(): void
    {
        if(PHP_SAPI!=='cli'||getenv('STAGE3_ALLOW_DELIVERY_UPGRADE')!=='YES')
            throw new \RuntimeException('Delivery upgrade requires explicit isolated CLI authorization');
        $required=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit','stage3_site_licenses'];
        $optional=['stage3_video_uploads','stage3_video_chunks','stage3_delivery_settings','stage3_delivery_outbox','stage3_delivery_routes','stage3_lead_workflow','stage3_lead_events','stage3_site_operations','stage3_site_incidents','stage3_approval_evidence','stage3_visual_findings'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if(array_diff($required,$tables)||array_diff($tables,[...$required,...$optional]))
            throw new \RuntimeException('Delivery upgrade requires the dedicated, fully access/licence-upgraded Stage3 database');
        foreach($this->deliverySchema() as $sql){
            preg_match('/CREATE TABLE ([a-z0-9_]+)/',$sql,$m);
            if(!in_array($m[1],$tables,true))$this->db->exec($sql);
        }
        // Outbox destinations for existing leads are left blank for legacy fallback.
        $columns=$this->driver==='sqlite'
            ?$this->db->query('PRAGMA table_info(stage3_delivery_outbox)')->fetchAll(PDO::FETCH_ASSOC)
            :$this->db->query('SHOW COLUMNS FROM stage3_delivery_outbox')->fetchAll(PDO::FETCH_ASSOC);
        $names=array_map(static fn(array $r):string=>(string)($r['name']??$r['Field']),$columns);
        if(!in_array('target',$names,true))
            $this->db->exec("ALTER TABLE stage3_delivery_outbox ADD COLUMN target VARCHAR(254) NOT NULL DEFAULT ''");
    }

    private function deliverySettingsRow(string $siteId): ?array
    {
        $q=$this->db->prepare('SELECT email_enabled,email_recipient,telegram_enabled,telegram_chat_id,version,operator,reason,changed_at FROM stage3_delivery_settings WHERE site_id=?');
        $q->execute([$siteId]);$r=$q->fetch(PDO::FETCH_ASSOC);
        return $r===false?null:$r;
    }

    private function deliveryTransport(string $channel): array
    {
        if($channel==='email'){
            $from=getenv('STAGE3_MAIL_FROM');
            if(!is_string($from)||trim($from)==='')return ['ready'=>false,'reason'=>'sender_missing'];
            if(strlen($from)>254||filter_var($from,FILTER_VALIDATE_EMAIL)===false||preg_match('/[\r\n]/',$from))
                return ['ready'=>false,'reason'=>'sender_invalid'];
            if(!function_exists('mail'))return ['ready'=>false,'reason'=>'mail_unavailable'];
            return ['ready'=>true,'reason'=>'ready'];
        }
        if($channel==='telegram'){
            $token=getenv('STAGE3_TELEGRAM_BOT_TOKEN');
            if(!is_string($token)||$token==='')return ['ready'=>false,'reason'=>'bot_token_missing'];
            if(!preg_match('/^\d+:[A-Za-z0-9_-]{20,}$/D',$token))return ['ready'=>false,'reason'=>'bot_token_invalid'];
            if(!function_exists('curl_init')&&!filter_var((string)ini_get('allow_url_fopen'),FILTER_VALIDATE_BOOLEAN))
                return ['ready'=>false,'reason'=>'https_transport_unavailable'];
            return ['ready'=>true,'reason'=>'ready'];
        }
        return ['ready'=>false,'reason'=>'unknown_channel'];
    }


    /**
     * Explicit owner-only manual routing test. Never creates a lead, outbox
     * entry or fake delivery evidence. Reservation is audited before I/O.
     */
    public function probeFormDelivery(string $siteId,string $sectionId,string $channel,string $operator): array
    {
        $this->getDraft($siteId);
        if(!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$sectionId)
            ||!in_array($channel,['email','telegram'],true))
            throw new InvalidArgumentException('Choose a valid form and channel');
        if(!in_array($sectionId,array_column($this->editableDeliveryForms($siteId),'sectionId'),true))
            throw new NotFound('Form is not in the current draft or publication');
        $settings=$this->deliverySettingsRow($siteId)
            ??['email_enabled'=>0,'email_recipient'=>'','telegram_enabled'=>0,'telegram_chat_id'=>''];
        $recipient=$this->deliveryTarget($channel,$settings,$this->formRouteRow($siteId,$sectionId));
        if($recipient===null)throw new InvalidArgumentException('Channel is disabled for this form');
        if($recipient==='')throw new InvalidArgumentException('Save a recipient for this form first');
        $transport=$this->deliveryTransport($channel);
        if(!$transport['ready'])
            throw new InvalidArgumentException('Transport is not configured: '.$transport['reason']);
        if(($channel==='email'&&(!filter_var($recipient,FILTER_VALIDATE_EMAIL)
                ||strlen($recipient)>254||preg_match('/[\r\n]/',$recipient)))
            ||($channel==='telegram'&&!preg_match('/^-?\d{1,20}$/D',$recipient)))
            throw new InvalidArgumentException('Saved destination is invalid');
        $probeId='probe-'.bin2hex(random_bytes(8));
        // Serialized by the existing dedicated DB transaction. No concurrent
        // owner tabs can bypass three attempts per site per fifteen minutes.
        $this->atomic(function()use($siteId,$sectionId,$channel,$operator,$probeId):void{
            $q=$this->db->prepare("SELECT COUNT(*) FROM stage3_audit
                WHERE site_id=? AND action='delivery-probe-attempt' AND created_at>=?");
            $q->execute([$siteId,gmdate('Y-m-d\TH:i:s\Z',time()-900)]);
            if((int)$q->fetchColumn()>=3)
                throw new Conflict('Maximum three routing tests per site in 15 minutes');
            $this->audit($operator,'delivery-probe-attempt',$siteId,'requested',
                $probeId.' form='.$sectionId.' channel='.$channel);
        });
        $message="MANUFACT AI Site CMS — ROUTING TEST (NOT A CLIENT LEAD)\n".
            "Site ID: ".$siteId."\nForm: ".$sectionId."\nChannel: ".$channel.
            "\nTest ID: ".$probeId."\nUTC: ".$this->now().
            "\nCheck the intended inbox/chat manually. This message contains no customer data.";
        try{
            $result=$channel==='email'
                ?$this->sendDeliveryEmail($recipient,$siteId,$message,'CMS routing test ['.$siteId.']')
                :$this->sendDeliveryTelegram($recipient,$message);
        }catch(Throwable $e){
            $result=['state'=>'uncertain','error'=>'transport_exception'];
        }
        $state=$result['state']??'uncertain';
        $this->audit($operator,'delivery-probe-result',$siteId,$state,
            $probeId.' form='.$sectionId.' channel='.$channel.' error='.($result['error']??'none'));
        return ['format'=>'manufact-form-delivery-probe-v1','siteId'=>$siteId,
            'sectionId'=>$sectionId,'channel'=>$channel,'probeId'=>$probeId,
            'state'=>$state,'error'=>$result['error']??null,
            'leadCreated'=>false,'externalReceiptConfirmed'=>false,
            'note'=>'Transport acceptance is not inbox receipt; check the intended recipient manually.'];
    }


    /** Bounded, private, durable manual-routing-test ledger from existing audit. */
    public function deliveryProbeHistory(string $siteId): array
    {
        $this->getDraft($siteId);
        $q=$this->db->prepare("SELECT actor,action,outcome,detail,created_at FROM stage3_audit
            WHERE site_id=? AND action IN ('delivery-probe-attempt','delivery-probe-result','delivery-probe-receipt')
            ORDER BY created_at DESC,event_id DESC LIMIT 240");
        $q->execute([$siteId]);$probes=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            if(!preg_match('/^(probe-[a-f0-9]{16}) form=([a-z][a-z0-9-]{2,79}) channel=(email|telegram)(?: error=([a-z_]+))?$/D',
                $row['detail'],$m))continue;
            $id=$m[1];
            if(!isset($probes[$id]))$probes[$id]=[
                'probeId'=>$id,'sectionId'=>$m[2],'channel'=>$m[3],
                'requestedAt'=>null,'transportState'=>null,'transportError'=>null,
                'ownerReceived'=>null,'ownerReceiptAt'=>null,'ownerReceiptActor'=>null
            ];
            if($probes[$id]['sectionId']!==$m[2]||$probes[$id]['channel']!==$m[3])continue;
            if($row['action']==='delivery-probe-attempt')
                $probes[$id]['requestedAt']=$row['created_at'];
            if($row['action']==='delivery-probe-result'){
                $probes[$id]['transportState']=$row['outcome'];
                $probes[$id]['transportError']=($m[4]??'none')==='none'?null:($m[4]??null);
            }
            if($row['action']==='delivery-probe-receipt'){
                $probes[$id]['ownerReceived']=$row['outcome']==='received';
                $probes[$id]['ownerReceiptAt']=$row['created_at'];
                $probes[$id]['ownerReceiptActor']=$row['actor'];
            }
        }
        $items=array_values(array_filter($probes,static fn(array $item):bool=>
            $item['requestedAt']!==null&&$item['transportState']!==null));
        usort($items,static fn(array $a,array $b):int=>
            strcmp($b['requestedAt'],$a['requestedAt'])?:strcmp($b['probeId'],$a['probeId']));
        return ['format'=>'manufact-form-delivery-probe-history-v1','siteId'=>$siteId,
            'probes'=>array_slice($items,0,60),
            'note'=>'Owner-reported test receipt is not proof of actual visitor-form delivery.'];
    }

    /** Owner can record one personal observation per real test, never forge an attempt. */
    public function confirmDeliveryProbeReceipt(string $siteId,string $probeId,bool $received,string $operator): array
    {
        $this->getDraft($siteId);
        if(!preg_match('/^probe-[a-f0-9]{16}$/D',$probeId))
            throw new InvalidArgumentException('Invalid routing-test ID');
        $this->atomic(function()use($siteId,$probeId,$received,$operator):void{
            $q=$this->db->prepare("SELECT action,detail FROM stage3_audit WHERE site_id=?
                AND action IN ('delivery-probe-attempt','delivery-probe-result','delivery-probe-receipt')
                AND detail LIKE ?");
            $q->execute([$siteId,$probeId.' form=%']);
            $attempt=null;$result=null;$already=false;
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
                if(!preg_match('/^'.preg_quote($probeId,'/').' form=([a-z][a-z0-9-]{2,79}) channel=(email|telegram)(?: error=[a-z_]+)?$/D',
                    $row['detail'],$m))continue;
                $detail=$probeId.' form='.$m[1].' channel='.$m[2];
                if($row['action']==='delivery-probe-attempt')$attempt=$detail;
                if($row['action']==='delivery-probe-result')$result=$detail;
                if($row['action']==='delivery-probe-receipt')$already=true;
            }
            if($attempt===null||$result===null||$attempt!==$result)
                throw new NotFound('No completed delivery test with this ID');
            if($already)throw new Conflict('Receipt observation already recorded for this test');
            $this->audit($operator,'delivery-probe-receipt',$siteId,
                $received?'received':'not_received',$attempt);
        });
        return $this->deliveryProbeHistory($siteId);
    }

    public function deliveryStatus(string $siteId): array
    {
        $this->getDraft($siteId);
        $r=$this->deliverySettingsRow($siteId);
        $settings=[
            'emailEnabled'=>$r!==null&&(int)$r['email_enabled']===1,'emailRecipient'=>$r['email_recipient']??'',
            'telegramEnabled'=>$r!==null&&(int)$r['telegram_enabled']===1,'telegramChatId'=>$r['telegram_chat_id']??'',
            'version'=>$r===null?0:(int)$r['version'],'operator'=>$r['operator']??null,
            'reason'=>$r['reason']??null,'changedAt'=>$r['changed_at']??null
        ];
        $transport=['email'=>$this->deliveryTransport('email'),'telegram'=>$this->deliveryTransport('telegram')];
        $channels=[];
        foreach(['email','telegram'] as $channel){
            $enabled=$settings[$channel==='email'?'emailEnabled':'telegramEnabled'];
            $recipient=$channel==='email'?$settings['emailRecipient']:$settings['telegramChatId'];
            $configured=$recipient!=='';$ready=$transport[$channel]['ready'];
            $state=!$enabled?'disabled':(!$configured||!$ready?'configuration_required':'ready');
            $q=$this->db->prepare('SELECT state,COUNT(*) AS amount FROM stage3_delivery_outbox WHERE site_id=? AND channel=? GROUP BY state');
            $q->execute([$siteId,$channel]);$counts=[];
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)$counts[(string)$row['state']]=(int)$row['amount'];
            $channels[$channel]=['enabled'=>$enabled,'recipientConfigured'=>$configured,'transportReady'=>$ready,
                'configurationStatus'=>$state,'configurationReason'=>!$enabled?'disabled':(!$configured?'recipient_missing':$transport[$channel]['reason']),
                'counts'=>$counts];
        }
        $totals=['pending'=>0,'sending'=>0,'accepted'=>0,'failed'=>0,'configuration_required'=>0,'uncertain'=>0,'disabled'=>0];
        $q=$this->db->prepare('SELECT state,COUNT(*) AS amount FROM stage3_delivery_outbox WHERE site_id=? GROUP BY state');
        $q->execute([$siteId]);
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){$state=(string)$row['state'];if(array_key_exists($state,$totals))$totals[$state]=(int)$row['amount'];}
        $q=$this->db->prepare('SELECT delivery_id,submission_id,channel,state,attempts,updated_at,accepted_at,last_error FROM stage3_delivery_outbox WHERE site_id=? ORDER BY created_at DESC,delivery_id DESC LIMIT 16');
        $q->execute([$siteId]);
        $recent=array_map(static fn(array $row):array=>[
            'id'=>$row['delivery_id'],'submissionId'=>$row['submission_id'],'channel'=>$row['channel'],
            'state'=>$row['state'],'attempts'=>(int)$row['attempts'],'updatedAt'=>$row['updated_at'],
            'acceptedAt'=>$row['accepted_at'],'lastError'=>$row['last_error']
        ],$q->fetchAll(PDO::FETCH_ASSOC));
        return ['settings'=>$settings,'transport'=>$transport,'channels'=>$channels,'totals'=>$totals,
            'routes'=>$this->deliveryFormRoutes($siteId),'recent'=>$recent,'retryable'=>$totals['pending']+$totals['failed']+$totals['configuration_required']>0,
            'uncertain'=>$totals['uncertain']];
    }

    public function saveDeliverySettings(string $siteId,string $operator,int $version,
        bool $emailEnabled,string $emailRecipient,bool $telegramEnabled,string $telegramChatId,string $reason): array
    {
        $reason=trim($reason);$emailRecipient=trim($emailRecipient);$telegramChatId=trim($telegramChatId);
        if($version<0||$version>1000000000||$reason===''||strlen($reason)>240||preg_match('/[\x00-\x1f\x7f]/',$reason))
            throw new InvalidArgumentException('Delivery settings version and reason required');
        if(strlen($emailRecipient)>254||($emailRecipient!==''&&filter_var($emailRecipient,FILTER_VALIDATE_EMAIL)===false))
            throw new InvalidArgumentException('Email recipient must be a valid address or empty');
        if(strlen($telegramChatId)>32||($telegramChatId!==''&&!preg_match('/^-?\d{1,20}$/D',$telegramChatId)))
            throw new InvalidArgumentException('Telegram chat ID must be a numeric chat ID or empty');
        $this->getDraft($siteId);
        $this->atomic(function()use($siteId,$operator,$version,$emailEnabled,$emailRecipient,$telegramEnabled,$telegramChatId,$reason):void{
            $old=$this->deliverySettingsRow($siteId);$current=$old===null?0:(int)$old['version'];
            if($current!==$version)throw new Conflict('Stale delivery settings version; refresh first');
            $values=[(int)$emailEnabled,$emailRecipient,(int)$telegramEnabled,$telegramChatId,$operator,$reason,$this->now()];
            try{
                if($version===0){
                    $q=$this->db->prepare('INSERT INTO stage3_delivery_settings (email_enabled,email_recipient,telegram_enabled,telegram_chat_id,operator,reason,changed_at,version,site_id) VALUES (?,?,?,?,?,?,?,1,?)');
                    $q->execute([...$values,$siteId]);
                }else{
                    $q=$this->db->prepare('UPDATE stage3_delivery_settings SET email_enabled=?,email_recipient=?,telegram_enabled=?,telegram_chat_id=?,operator=?,reason=?,changed_at=?,version=version+1 WHERE site_id=? AND version=?');
                    $q->execute([...$values,$siteId,$version]);
                    if($q->rowCount()!==1)throw new Conflict('Delivery settings changed concurrently');
                }
            }catch(PDOException $e){
                if($version===0)throw new Conflict('Delivery settings initialized concurrently',0,$e);
                throw $e;
            }
        });
        return $this->deliveryStatus($siteId);
    }

    private function enqueueLeadDeliveries(string $siteId,string $submissionId): void
    {
        $settings=$this->deliverySettingsRow($siteId);
        // Snapshot recipient per accepted lead, independently of future routing edits.
        $q=$this->db->prepare('SELECT section_id FROM stage3_submissions WHERE site_id=? AND submission_id=?');
        $q->execute([$siteId,$submissionId]);$sectionId=$q->fetchColumn();
        if(!is_string($sectionId))return;
        $route=$this->formRouteRow($siteId,$sectionId);
        $defaults=$settings??['email_enabled'=>0,'email_recipient'=>'','telegram_enabled'=>0,'telegram_chat_id'=>''];
        foreach(['email','telegram'] as $channel){
            $target=$this->deliveryTarget($channel,$defaults,$route);
            if($target===null)continue;
            // New missing recipients must never inherit a future address.
            // Blank target is reserved exclusively for rows from older schemas.
            if($target==='')$target='@missing';
            $now=$this->now();$id='delivery-'.bin2hex(random_bytes(12));
            $q=$this->db->prepare('INSERT INTO stage3_delivery_outbox (delivery_id,site_id,submission_id,channel,state,attempts,created_at,updated_at,accepted_at,last_error,target) VALUES (?,?,?,?,?,0,?,?,NULL,NULL,?)');
            $q->execute([$id,$siteId,$submissionId,$channel,'pending',$now,$now,$target]);
        }
    }

    public function dispatchSubmissionDeliveries(string $siteId,string $submissionId): void
    {
        try{
            $this->getDraft($siteId);
            $q=$this->db->prepare("SELECT delivery_id FROM stage3_delivery_outbox WHERE site_id=? AND submission_id=? AND state='pending'");
            $q->execute([$siteId,$submissionId]);
            foreach($q->fetchAll(PDO::FETCH_COLUMN) as $id){
                try{$this->dispatchDelivery((string)$id);}
                catch(Throwable $e){error_log('Stage3 delivery dispatch failed: '.get_class($e));}
            }
        }catch(Throwable $e){error_log('Stage3 delivery queue unavailable: '.get_class($e));}
    }

    /** Mark abandoned sends uncertain; never assume an interrupted request failed. */
    private function markStaleDeliveryAttemptsUncertain(?string $siteId=null): int
    {
        $cutoff=gmdate('Y-m-d\TH:i:s\Z',time()-900);
        if($siteId===null){
            $q=$this->db->prepare("UPDATE stage3_delivery_outbox SET state='uncertain',last_error='interrupted_send',updated_at=? WHERE state='sending' AND updated_at<?");
            $q->execute([$this->now(),$cutoff]);
        }else{
            $q=$this->db->prepare("UPDATE stage3_delivery_outbox SET state='uncertain',last_error='interrupted_send',updated_at=? WHERE site_id=? AND state='sending' AND updated_at<?");
            $q->execute([$this->now(),$siteId,$cutoff]);
        }
        return $q->rowCount();
    }

    /**
     * Bounded CLI-worker entry point. Only pending jobs are processed; uncertain
     * sends require an explicit owner decision to avoid duplicate notifications.
     */
    public function processDeliveryQueue(int $limit=50): array
    {
        if($limit<1||$limit>250)throw new InvalidArgumentException('Delivery batch limit must be between 1 and 250');
        $staleMarked=$this->markStaleDeliveryAttemptsUncertain();
        $q=$this->db->prepare("SELECT delivery_id FROM stage3_delivery_outbox WHERE state='pending' ORDER BY created_at,delivery_id LIMIT ?");
        $q->bindValue(1,$limit,PDO::PARAM_INT);
        $q->execute();
        $ids=$q->fetchAll(PDO::FETCH_COLUMN);
        $outcomes=array_fill_keys(['accepted','failed','configuration_required','uncertain','disabled','pending','sending','other'],0);
        foreach($ids as $id){
            $id=(string)$id;
            try{$this->dispatchDelivery($id);}
            catch(Throwable $e){error_log('Stage3 delivery worker failed: '.get_class($e));}
            $stateQuery=$this->db->prepare('SELECT state FROM stage3_delivery_outbox WHERE delivery_id=?');
            $stateQuery->execute([$id]);
            $state=$stateQuery->fetchColumn();
            $key=is_string($state)&&array_key_exists($state,$outcomes)?$state:'other';
            $outcomes[$key]++;
        }
        return ['selected'=>count($ids),'staleMarkedUncertain'=>$staleMarked,'outcomes'=>$outcomes];
    }

    public function retryLeadDeliveries(string $siteId,bool $includeUncertain,string $reason): array
    {
        $reason=trim($reason);
        if($reason===''||strlen($reason)>240||preg_match('/[\x00-\x1f\x7f]/',$reason))
            throw new InvalidArgumentException('Retry reason required');
        $this->getDraft($siteId);
        $this->markStaleDeliveryAttemptsUncertain($siteId);
        $states=$includeUncertain?['pending','failed','configuration_required','uncertain']:['pending','failed','configuration_required'];
        $marks=implode(',',array_fill(0,count($states),'?'));
        $q=$this->db->prepare("SELECT delivery_id,state FROM stage3_delivery_outbox WHERE site_id=? AND state IN ($marks) ORDER BY created_at,delivery_id LIMIT 100");
        $q->execute([$siteId,...$states]);
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $update=$this->db->prepare("UPDATE stage3_delivery_outbox SET state='pending',last_error=NULL,updated_at=? WHERE site_id=? AND delivery_id=? AND state=?");
            $update->execute([$this->now(),$siteId,$row['delivery_id'],$row['state']]);
            if($update->rowCount()===1)$this->dispatchDelivery((string)$row['delivery_id']);
        }
        return $this->deliveryStatus($siteId);
    }

    private function dispatchDelivery(string $deliveryId): void
    {
        $q=$this->db->prepare('SELECT delivery_id,site_id,submission_id,channel,state,target FROM stage3_delivery_outbox WHERE delivery_id=?');
        $q->execute([$deliveryId]);$job=$q->fetch(PDO::FETCH_ASSOC);
        if(!$job||$job['state']!=='pending')return;
        $siteId=(string)$job['site_id'];$submissionId=(string)$job['submission_id'];$channel=(string)$job['channel'];
        $settings=$this->deliverySettingsRow($siteId);
        // Existing pending deliveries with target='' preserve legacy fallback.
        $recipient=(string)$job['target'];
        if($recipient==='@missing'){
            $this->finishDelivery($deliveryId,'configuration_required','recipient_missing');return;
        }
        if($recipient===''){
            $enabled=$channel==='email'?(int)($settings['email_enabled']??0)===1:
                ($channel==='telegram'&&(int)($settings['telegram_enabled']??0)===1);
            if(!$enabled){$this->finishDelivery($deliveryId,'disabled',null);return;}
            $recipient=$channel==='email'?($settings['email_recipient']??''):($settings['telegram_chat_id']??'');
        }
        if($recipient===''){$this->finishDelivery($deliveryId,'configuration_required','recipient_missing');return;}
        $transport=$this->deliveryTransport($channel);
        if(!$transport['ready']){$this->finishDelivery($deliveryId,'configuration_required',$transport['reason']);return;}
        $leadQ=$this->db->prepare('SELECT name,email,message,submitted_at,extras FROM stage3_submissions WHERE site_id=? AND submission_id=?');
        $leadQ->execute([$siteId,$submissionId]);$lead=$leadQ->fetch(PDO::FETCH_ASSOC);
        if(!$lead){$this->finishDelivery($deliveryId,'failed','submission_missing');return;}
        $site=$this->getDraft($siteId)['site'];
        $lines=['Новая заявка с сайта: '.(string)$site['title'],'ID заявки: '.$submissionId,
            'Дата UTC: '.(string)$lead['submitted_at'],'Имя: '.(string)$lead['name'],'Email: '.(string)$lead['email'],
            'Сообщение:',(string)$lead['message']];
        foreach(self::decode((string)$lead['extras']) as $extra)
            if(is_array($extra)&&is_string($extra['label']??null)&&is_string($extra['value']??null))
                $lines[]=$extra['label'].': '.$extra['value'];
        $message=implode("\n",$lines);
        $start=$this->db->prepare("UPDATE stage3_delivery_outbox SET state='sending',attempts=attempts+1,updated_at=?,last_error=NULL WHERE delivery_id=? AND state='pending'");
        $start->execute([$this->now(),$deliveryId]);if($start->rowCount()!==1)return;
        try{$result=$channel==='email'?$this->sendDeliveryEmail((string)$recipient,(string)$siteId,$message)
            :$this->sendDeliveryTelegram((string)$recipient,$message);}
        catch(Throwable $e){$result=['state'=>'uncertain','error'=>'transport_exception'];}
        $this->finishDelivery($deliveryId,$result['state'],$result['error']??null);
    }

    private function finishDelivery(string $id,string $state,?string $error): void
    {
        $accepted=$state==='accepted'?$this->now():null;
        $q=$this->db->prepare('UPDATE stage3_delivery_outbox SET state=?,last_error=?,accepted_at=?,updated_at=? WHERE delivery_id=? AND state IN (\'pending\',\'sending\')');
        $q->execute([$state,$error,$accepted,$this->now(),$id]);
    }

    private function sendDeliveryEmail(string $recipient,string $siteId,string $message,?string $subject=null): array
    {
        $from=(string)getenv('STAGE3_MAIL_FROM');
        if(!filter_var($from,FILTER_VALIDATE_EMAIL)||preg_match('/[\r\n]/',$from))
            return ['state'=>'configuration_required','error'=>'sender_invalid'];
        $headers="From: ".$from."\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8";
        try{$accepted=mail($recipient,$subject??('New website inquiry ['.$siteId.']'),$message,$headers);}
        catch(Throwable $e){return ['state'=>'failed','error'=>'mail_exception'];}
        return $accepted?['state'=>'accepted','error'=>null]:['state'=>'failed','error'=>'mail_rejected'];
    }

    private function sendDeliveryTelegram(string $chatId,string $message): array
    {
        $token=(string)getenv('STAGE3_TELEGRAM_BOT_TOKEN');
        if(!preg_match('/^\d+:[A-Za-z0-9_-]{20,}$/D',$token))
            return ['state'=>'configuration_required','error'=>'bot_token_missing'];
        if(strlen($message)>3500){$message=substr($message,0,3500);while($message!==''&&!preg_match('//u',$message))$message=substr($message,0,-1);}
        $url='https://api.telegram.org/bot'.$token.'/sendMessage';
        $payload=json_encode(['chat_id'=>$chatId,'text'=>$message,'disable_web_page_preview'=>true],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        if(function_exists('curl_init')){
            $ch=curl_init($url);
            curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>6,CURLOPT_FOLLOWLOCATION=>false,
                CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
            $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$err=curl_errno($ch);curl_close($ch);
            if($raw===false)return ['state'=>'uncertain','error'=>$err===0?'telegram_transport':'telegram_timeout'];
        }else{
            $ctx=stream_context_create(['http'=>['method'=>'POST','header'=>"Content-Type: application/json\r\n",'content'=>$payload,
                'timeout'=>6,'ignore_errors'=>true,'follow_location'=>0,'max_redirects'=>0],
                'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false]]);
            $raw=@file_get_contents($url,false,$ctx);$headers=$http_response_header??[];$status=0;
            if(is_array($headers)&&isset($headers[0])&&preg_match('/\s(\d{3})\s/',$headers[0],$m))$status=(int)$m[1];
            if($raw===false)return ['state'=>'uncertain','error'=>'telegram_transport'];
        }
        $data=json_decode((string)$raw,true);
        if($status===200&&is_array($data)&&($data['ok']??false)===true)return ['state'=>'accepted','error'=>null];
        if(is_array($data)&&($data['ok']??null)===false)return ['state'=>'failed','error'=>'telegram_rejected'];
        if($status>=400)return ['state'=>'failed','error'=>'telegram_http_rejected'];
        return ['state'=>'uncertain','error'=>'telegram_response_unknown'];
    }
}
