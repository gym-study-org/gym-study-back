import fs from 'fs';
import path from 'path';
import { Request, Response, Router } from 'express';
import helmet from 'helmet';

const router = Router();
const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml');

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Gym Study · API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script src="/docs/init.js"></script>
</body></html>`;

// Swagger UI vem do jsDelivr: libera só esse CDN na CSP desta página
router.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    },
  })
);

router.get('/', (_req, res) => {
  res.type('html').send(html);
});

router.get('/init.js', (_req, res) => {
  res
    .type('js')
    .send(
      "SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger', deepLinking: true, tryItOutEnabled: true, persistAuthorization: true });"
    );
});

export const openapiHandler = (_req: Request, res: Response) => {
  res.type('application/yaml').send(fs.readFileSync(specPath, 'utf8'));
};

export default router;
