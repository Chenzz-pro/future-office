const https = require('https');
const http = require('http');

const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getLoginSessionId xmlns="http://webservice.sys.ekp.landray.com.cn/">
      <arg0>admin</arg0>
      <arg1></arg1>
    </getLoginSessionId>
  </soap:Body>
</soap:Envelope>`;

const options = {
  hostname: 'oa.fjhxrl.com',
  port: 443,
  path: '/sys/webserviceservice/',
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': 'http://webservice.sys.ekp.landray.com.cn/loginWebserviceService/getLoginSessionId',
    'Content-Length': Buffer.byteLength(soapBody),
    'User-Agent': 'Node.js Test Client'
  }
};

const req = https.request(options, (res) => {
  console.log('状态码:', res.statusCode);
  console.log('响应头:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('响应长度:', data.length);
    console.log('响应前 500 字符:', data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(soapBody);
req.end();
