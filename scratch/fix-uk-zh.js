const fs = require('fs');

const uk = fs.readFileSync('src/messages/uk.json', 'utf8');
const ukIdx = uk.indexOf('"adminPartnerCreate"');
fs.writeFileSync('src/messages/uk.json', uk.slice(0, ukIdx) + `"adminPartnerCreate": {
    "metaTitle": "Додати партнера",
    "title": "Додати партнера",
    "companyNameLabel": "Назва компанії *",
    "contactEmailLabel": "Контактний e-mail *",
    "websiteUrlLabel": "Вебсайт (необов’язково)",
    "submitButton": "Створити партнера",
    "cancelButton": "Скасувати",
    "creating": "Створення...",
    "errorTitle": "Помилка",
    "errorDescription": "Не вдалося створити партнера.",
    "invalidEmail": "Некоректна адреса e-mail",
    "invalidWebsite": "Некоректна URL-адреса (має починатися з http:// або https://)"
  }
}
`);

const zh = fs.readFileSync('src/messages/zh.json', 'utf8');
const zhIdx = zh.indexOf('"adminPartnerCreate"');
fs.writeFileSync('src/messages/zh.json', zh.slice(0, zhIdx) + `"adminPartnerCreate": {
    "metaTitle": "添加合作伙伴",
    "title": "添加合作伙伴",
    "companyNameLabel": "公司名称 *",
    "contactEmailLabel": "联系邮箱 *",
    "websiteUrlLabel": "网站（可选）",
    "submitButton": "创建合作伙伴",
    "cancelButton": "取消",
    "creating": "正在创建...",
    "errorTitle": "错误",
    "errorDescription": "无法创建合作伙伴。",
    "invalidEmail": "邮箱地址无效",
    "invalidWebsite": "URL 无效（必须以 http:// 或 https:// 开头）"
  }
}
`);
