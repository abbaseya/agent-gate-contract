import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaUrl = new URL('../../schema/agc.schema.json', import.meta.url);
export const agcSchema = JSON.parse(readFileSync(schemaUrl, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(agcSchema);

const SELF_APPLIED = new Set(['rewrite', 'generate']);

const diagnostic = (path, rule, message) => ({ path, rule, message, severity: 'error' });

function schemaDiagnostics(response) {
  if (validateSchema(response)) return [];
  return validateSchema.errors.map((error) =>
    diagnostic(error.instancePath || '$', 'schema', error.message || 'schema validation failed'));
}

function verdictDiagnostics(response) {
  const errors = [];
  const findings = response.findings || [];
  const blocking = findings.filter((finding) => finding.severity === 'blocking');
  const selfFixable = (finding) => SELF_APPLIED.has(finding.remedy.kind);

  if (response.verdict === 'allow' && blocking.length > 0) {
    errors.push(diagnostic('/verdict', '§6', '`allow` must not carry a blocking finding'));
  }
  if (response.verdict === 'block') {
    if (blocking.length === 0) errors.push(diagnostic('/verdict', '§6', '`block` needs at least one blocking finding'));
    else if (blocking.every(selfFixable)) {
      errors.push(diagnostic('/verdict', '§6', 'every blocking finding has a rewrite or generate remedy, so the gate must apply them and return `repaired`'));
    }
  }
  if (response.verdict === 'repaired') {
    if (blocking.length === 0) errors.push(diagnostic('/verdict', '§6', '`repaired` needs at least one blocking finding'));
    blocking.forEach((finding) => {
      if (!selfFixable(finding) || finding.remedy.applied !== true) {
        errors.push(diagnostic(`/findings/${findings.indexOf(finding)}/remedy`, '§6',
          '`repaired` requires every blocking finding to have an applied rewrite or generate remedy'));
      }
    });
  }
  if (response.verdict === 'escalate' && !findings.some((finding) => finding.remedy.kind === 'decide')) {
    errors.push(diagnostic('/verdict', '§6', '`escalate` needs a finding with a `decide` remedy'));
  }
  return errors;
}

function findingDiagnostics(response) {
  const errors = [];
  const findings = response.findings || [];
  const seen = new Set();
  findings.forEach((finding, index) => {
    if (seen.has(finding.id)) errors.push(diagnostic(`/findings/${index}/id`, '§7', `duplicate finding id ${finding.id}`));
    seen.add(finding.id);
    if (response.gate.kind === 'deterministic' && finding.check.kind === 'condition') {
      errors.push(diagnostic(`/findings/${index}/check`, '§7.2', 'a deterministic gate must use a `command` or `preview` check'));
    }
    if (response.coverage.complete && !response.coverage.classes.includes(finding.class)) {
      errors.push(diagnostic(`/findings/${index}/class`, '§8', `coverage is complete but does not list class ${finding.class}`));
    }
  });
  const { n, budget } = response.attempt;
  if (n > budget) errors.push(diagnostic('/attempt', '§10', `attempt ${n} exceeds budget ${budget}`));
  if (n === budget && response.verdict === 'block') {
    errors.push(diagnostic('/verdict', '§10', 'the attempt budget is spent, so the gate must escalate instead of block'));
  }
  return errors;
}

export function validateResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return [diagnostic('$', 'schema', 'expected a JSON object')];
  }
  const errors = schemaDiagnostics(response);
  if (errors.length > 0) return errors;
  return [...verdictDiagnostics(response), ...findingDiagnostics(response)];
}

export function validateChain(responses) {
  const errors = [];
  const raised = new Set();
  const closed = new Set();
  responses.forEach((response, round) => {
    validateResponse(response).forEach((error) => errors.push({ ...error, path: `[${round}]${error.path}` }));
    if (response.attempt?.n !== round + 1) {
      errors.push(diagnostic(`[${round}]/attempt/n`, '§9', `round ${round + 1} carries attempt ${response.attempt?.n}`));
    }
    const findings = response.findings || [];
    const ids = new Set(findings.map((finding) => finding.id));
    findings.forEach((finding, index) => {
      const path = `[${round}]/findings/${index}/status`;
      if (finding.status === 'still-open' && !raised.has(finding.id)) {
        errors.push(diagnostic(path, '§9', `${finding.id} is still-open but no earlier round raised it`));
      }
      if (finding.status === 'regressed' && !closed.has(finding.id)) {
        errors.push(diagnostic(path, '§9', `${finding.id} is regressed but no earlier round carried it as closed`));
      }
      if (finding.status === 'new' && raised.has(finding.id)) {
        errors.push(diagnostic(path, '§9', `${finding.id} is marked new but an earlier round raised it`));
      }
    });
    (response.carried || []).forEach((id, index) => {
      const path = `[${round}]/carried/${index}`;
      if (!raised.has(id)) errors.push(diagnostic(path, '§9', `${id} is carried but no earlier round raised it`));
      if (ids.has(id)) errors.push(diagnostic(path, '§9', `${id} is both carried and reported in this round`));
      closed.add(id);
    });
    findings.forEach((finding) => { raised.add(finding.id); closed.delete(finding.id); });
  });
  return errors;
}
