/**
 * 외부 연동 설정
 * EXTERNAL_API_LIVE=false일 때 모든 외부 호출은 로깅만 수행 (dry-run)
 */
export const integrationConfig = {
  isLive: process.env.EXTERNAL_API_LIVE === 'true',

  n8n: {
    proposal: process.env.N8N_WEBHOOK_PROPOSAL ?? '',
    docRemind: process.env.N8N_WEBHOOK_DOC_REMIND ?? '',
    driveUpload: process.env.N8N_WEBHOOK_DRIVE_UPLOAD ?? '',
    slackNotify: process.env.N8N_WEBHOOK_SLACK_NOTIFY ?? '',
    ocrParse: process.env.N8N_WEBHOOK_OCR_PARSE ?? '',
  },

  signok: {
    apiUrl: process.env.SIGNOK_API_URL ?? '',
    apiKey: process.env.SIGNOK_API_KEY ?? '',
    senderEmail: process.env.SIGNOK_SENDER_EMAIL ?? '',
  },

  gdrive: {
    rootFolderId: process.env.GDRIVE_ROOT_FOLDER_ID ?? '',
  },
}
