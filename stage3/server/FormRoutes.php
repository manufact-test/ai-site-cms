<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;

/** Owner-only form recipients, isolated from public approved-site manifest. */
trait FormRoutes
{
    private function deliveryRouteSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return ["CREATE TABLE stage3_delivery_routes (site_id $id NOT NULL,section_id $id NOT NULL,email_mode VARCHAR(12) NOT NULL,email_recipient VARCHAR(254) NOT NULL,telegram_mode VARCHAR(12) NOT NULL,telegram_chat_id VARCHAR(32) NOT NULL,version INTEGER NOT NULL,operator $id NOT NULL,reason VARCHAR(240) NOT NULL,changed_at VARCHAR(35) NOT NULL,PRIMARY KEY(site_id,section_id))$tail"];
    }

    private function formRouteRow(string $siteId,string $sectionId): ?array
    {
        $q=$this->db->prepare('SELECT email_mode,email_recipient,telegram_mode,telegram_chat_id,version,operator,reason,changed_at FROM stage3_delivery_routes WHERE site_id=? AND section_id=?');
        $q->execute([$siteId,$sectionId]);$row=$q->fetch(PDO::FETCH_ASSOC);
        return $row===false?null:$row;
    }

    private function editableDeliveryForms(string $siteId): array
    {
        // The public site can still contain a form already removed from an
        // unpublished draft. Never hide live forms from owner routing.
        $forms=[];
        $add=function(array $site,string $source)use(&$forms):void{
            foreach($site['pages'] as $page)
                foreach($page['sections'] as $section)
                    if(in_array($section['component'],['lead-form','lead-form-flex'],true)
                        && (!isset($section['designGraph']) || DesignGraph::formSlotIds($section['designGraph'])!==[])){
                        $id=$section['id'];
                        if(!isset($forms[$id]))
                            $forms[$id]=['sectionId'=>$id,'label'=>(string)$page['title'].' · '.$id,
                                'pageId'=>$page['id'],'sources'=>[]];
                        $forms[$id]['sources'][]=$source;
                    }
        };
        $add($this->getDraft($siteId)['site'],'draft');
        try{$add($this->published($siteId)['site'],'published');}
        catch(NotFound $e){} // Unpublished sites have no public routing target.
        foreach($forms as &$form)
            if(!in_array('draft',$form['sources'],true))
                $form['label'].=' (опубликована, нет в черновике)';
        unset($form);
        return array_values($forms);
    }

    private function deliveryFormRoutes(string $siteId): array
    {
        $routes=[];
        foreach($this->editableDeliveryForms($siteId) as $form){
            $row=$this->formRouteRow($siteId,$form['sectionId']);
            $routes[]=[...$form,'emailMode'=>$row['email_mode']??'inherit',
                'emailRecipient'=>$row['email_recipient']??'',
                'telegramMode'=>$row['telegram_mode']??'inherit',
                'telegramChatId'=>$row['telegram_chat_id']??'',
                'version'=>$row===null?0:(int)$row['version']];
        }
        return $routes;
    }

    /** Changes are version-checked and audited without changing public releases. */
    public function saveFormDeliveryRoute(string $siteId,string $sectionId,string $operator,int $version,
        string $emailMode,string $emailRecipient,string $telegramMode,string $telegramChatId,string $reason): array
    {
        $reason=trim($reason);$emailRecipient=trim($emailRecipient);$telegramChatId=trim($telegramChatId);
        if(!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$sectionId)
            ||$version<0||$version>1000000000||$reason===''||strlen($reason)>240
            ||preg_match('/[\x00-\x1f\x7f]/',$reason)
            ||!in_array($emailMode,['inherit','off','custom'],true)
            ||!in_array($telegramMode,['inherit','off','custom'],true))
            throw new InvalidArgumentException('Invalid form routing mode, version or reason');
        if($emailMode!=='custom')$emailRecipient='';
        if($telegramMode!=='custom')$telegramChatId='';
        if(($emailMode==='custom'&&(strlen($emailRecipient)>254||!filter_var($emailRecipient,FILTER_VALIDATE_EMAIL)
            ||preg_match('/[\r\n]/',$emailRecipient)))
            ||($telegramMode==='custom'&&!preg_match('/^-?\d{1,20}$/D',$telegramChatId)))
            throw new InvalidArgumentException('Invalid custom delivery destination');
        if(!in_array($sectionId,array_column($this->editableDeliveryForms($siteId),'sectionId'),true))
            throw new NotFound('Form is not in the current site');
        $this->atomic(function()use($siteId,$sectionId,$operator,$version,$emailMode,$emailRecipient,$telegramMode,$telegramChatId,$reason):void {
            $old=$this->formRouteRow($siteId,$sectionId);
            if(($old===null?0:(int)$old['version'])!==$version)
                throw new Conflict('Form routing changed; refresh before saving');
            $values=[$emailMode,$emailRecipient,$telegramMode,$telegramChatId,$operator,$reason,$this->now()];
            if($version===0){
                try{
                    $q=$this->db->prepare('INSERT INTO stage3_delivery_routes (email_mode,email_recipient,telegram_mode,telegram_chat_id,operator,reason,changed_at,version,site_id,section_id) VALUES (?,?,?,?,?,?,?,1,?,?)');
                    $q->execute([...$values,$siteId,$sectionId]);
                }catch(\PDOException $e){throw new Conflict('Form routing created concurrently',0,$e);}
            }else{
                $q=$this->db->prepare('UPDATE stage3_delivery_routes SET email_mode=?,email_recipient=?,telegram_mode=?,telegram_chat_id=?,operator=?,reason=?,changed_at=?,version=version+1 WHERE site_id=? AND section_id=? AND version=?');
                $q->execute([...$values,$siteId,$sectionId,$version]);
                if($q->rowCount()!==1)throw new Conflict('Form routing changed concurrently');
            }
        });
        return $this->deliveryStatus($siteId);
    }

    /** Null skips channel; empty target leaves enabled channel pending configuration. */
    private function deliveryTarget(string $channel,array $defaults,?array $route): ?string
    {
        $mode=$route[$channel.'_mode']??'inherit';
        if($mode==='off')return null;
        if($mode==='custom')return (string)($route[$channel==='email'?'email_recipient':'telegram_chat_id']??'');
        if((int)$defaults[$channel==='email'?'email_enabled':'telegram_enabled']!==1)return null;
        return (string)$defaults[$channel==='email'?'email_recipient':'telegram_chat_id'];
    }
}
