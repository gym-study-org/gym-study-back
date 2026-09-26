// Popula a API local com usuários e dados de exemplo para demonstração.
// Uso: node scripts/seed-demo.mjs  (API em http://localhost:5000, ou API_URL=...)
// Login de demonstração: ana@gymstudy.dev / Demo1234

const API = `${process.env.API_URL || 'http://localhost:5000'}/api`;
const PASSWORD = 'Demo1234';

const USERS = [
  { username: 'ana', full_name: 'Ana Souza', subjects: ['AWS', 'Kubernetes', 'Terraform'] },
  { username: 'bruno', full_name: 'Bruno Lima', subjects: ['Kubernetes', 'Go', 'Linux'] },
  { username: 'carla', full_name: 'Carla Mendes', subjects: ['Python', 'Machine Learning', 'AWS'] },
  { username: 'diego', full_name: 'Diego Rocha', subjects: ['Terraform', 'Azure', 'DevOps'] },
  { username: 'elisa', full_name: 'Elisa Martins', subjects: ['React', 'TypeScript', 'Node.js'] },
];

const TOPICS = {
  AWS: ['VPC e subnets', 'IAM policies', 'Amazon Bedrock', 'Lambda e API Gateway'],
  Kubernetes: ['Pods e Deployments', 'Services e Ingress', 'RBAC', 'Helm charts'],
  Terraform: ['Módulos', 'State remoto', 'Workspaces', 'for_each e count'],
  Go: ['Goroutines', 'Interfaces', 'Testes em Go'],
  Linux: ['systemd', 'Permissões', 'Shell script'],
  Python: ['Pandas', 'FastAPI', 'Testes com pytest'],
  'Machine Learning': ['Regressão linear', 'Árvores de decisão', 'Avaliação de modelos'],
  Azure: ['Resource Groups', 'AKS', 'Azure DevOps'],
  DevOps: ['GitHub Actions', 'Observabilidade', 'Docker multi-stage'],
  React: ['Hooks', 'Server Components', 'React Query'],
  TypeScript: ['Generics', 'Tipos utilitários', 'Zod'],
  'Node.js': ['Express', 'Streams', 'Filas com BullMQ'],
};

const CERTS = {
  ana: [{ name: 'AWS Certified Cloud Practitioner', provider: 'AWS', category: 'Cloud', score: 870, max_score: 1000 }],
  bruno: [{ name: 'Certified Kubernetes Administrator', provider: 'CNCF', category: 'Cloud Native', score: 89, max_score: 100 }],
  carla: [{ name: 'AWS Certified AI Practitioner', provider: 'AWS', category: 'IA', score: 812, max_score: 1000 }],
  diego: [{ name: 'HashiCorp Terraform Associate', provider: 'HashiCorp', category: 'IaC', score: 84, max_score: 100 }],
};

const POSTS = {
  ana: 'Fechei a semana com 12h de estudo de Kubernetes. Próxima parada: CKAD! 🚀',
  bruno: 'Dica: `kubectl explain` salva muito tempo na prova da CKA.',
  carla: 'Aprovada na AWS AI Practitioner! Bedrock e RAG caíram bastante.',
  diego: 'Refatorei meus módulos Terraform com for_each e ficou bem mais limpo.',
};

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json.data ?? json;
}

async function login(u) {
  const email = `${u.username}@gymstudy.dev`;
  try {
    return await call('POST', '/auth/register', null, { email, username: u.username, password: PASSWORD, full_name: u.full_name });
  } catch {
    return call('POST', '/auth/login', null, { email, password: PASSWORD });
  }
}

const daysAgo = (d, h = 19) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t;
};

async function main() {
  const accounts = [];
  for (const [i, u] of USERS.entries()) {
    const { user, token } = await login(u);
    accounts.push({ ...u, id: user.id, token });

    // Sessões de estudo nos últimos 14 dias (quem vem antes na lista estuda mais)
    for (let d = 13; d >= 0; d--) {
      if (i > 0 && (d + i) % (6 - i) === 0) continue;
      const subject = u.subjects[d % u.subjects.length];
      const topic = TOPICS[subject][d % TOPICS[subject].length];
      const minutes = 30 + ((d * 17 + i * 11) % 5) * 15 + (USERS.length - i) * 10;
      const start = daysAgo(d, 18 + (d % 3));
      await call('POST', '/study-sessions', token, {
        title: topic,
        subject,
        duration_minutes: minutes,
        tags: [subject.toLowerCase()],
        started_at: start.toISOString(),
        finished_at: new Date(start.getTime() + minutes * 60000).toISOString(),
      });
    }

    for (const c of CERTS[u.username] || []) {
      await call('POST', '/certifications', token, { ...c, obtained_at: daysAgo(20 + i * 7).toISOString() });
    }

    await call('POST', '/goals', token, {
      title: `Estudar 20h de ${u.subjects[0]}`,
      category: u.subjects[0],
      target_type: 'hours',
      target_value: 20,
      start_date: daysAgo(14).toISOString().slice(0, 10),
      end_date: daysAgo(-16).toISOString().slice(0, 10),
    });

    if (POSTS[u.username]) {
      await call('POST', '/feed/posts', token, { content: POSTS[u.username], tags: u.subjects.slice(0, 2) });
    }
  }

  // Ana é amiga de todo mundo
  const [ana, ...others] = accounts;
  for (const o of others) {
    try {
      const req = await call('POST', '/friendships/request', ana.token, { addressee_id: o.id });
      await call('PATCH', `/friendships/request/${req.id}`, o.token, { status: 'accepted' });
    } catch (e) {
      console.warn(`amizade ana -> ${o.username}: ${e.message}`);
    }
  }

  console.log(`Seed concluído: ${accounts.length} usuários. Login: ana@gymstudy.dev / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
