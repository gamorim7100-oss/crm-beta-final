import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://auuajtpczenwuopduamb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dWFqdHBjemVud3VvcGR1YW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE4MzA0NiwiZXhwIjoyMDk1NzU5MDQ2fQ.Bi5OhLSO8VMkmGsj-V4kKevGlH_6UV4qRTKOw2Et2Dc'
)

const raw = [
  {n:'Gabriel Fernandes Amorim',c:'11685186955',d:'2026-04-17',v:100000,g:12173,q:6529},
  {n:'Lucilene Duarte Sanabria',c:'87596857191',d:'2026-04-17',v:100000,g:12173,q:6561},
  {n:'Milena Assunção Trindade',c:'04775574574',d:'2026-04-20',v:100000,g:12179,q:653},
  {n:'Guilherme Oliveira Costa',c:'45068164801',d:'2026-04-28',v:100000,g:12180,q:4467},
  {n:'Marcos Antônio freire Bastos',c:'09378379702',d:'2026-04-28',v:100000,g:12180,q:4468},
  {n:'Francisca Valeria Barboza Silva de Almeida',c:'05096878309',d:'2026-04-30',v:80000,g:12180,q:7061},
  {n:'Laís Faria Santos de Jesus',c:'37636706881',d:'2026-04-30',v:52000,g:1702,q:838},
  {n:'Laís Faria Santos de Jesus',c:'37636706871',d:'2026-04-30',v:100000,g:12180,q:3938},
  {n:'Anael Carvalho Santiago',c:'00687066344',d:'2026-04-30',v:80000,g:12180,q:7061},
  {n:'Rafaella Teles maddy',c:'91886198268',d:'2026-04-30',v:100000,g:12180,q:7060},
  {n:'Eduardo Henrique Ponciano Silva',c:'40520470877',d:'2026-04-30',v:100000,g:12180,q:7073},
  {n:'Denevaldo Rodrigues',c:'15515073827',d:'2026-05-04',v:100000,g:12180,q:8035},
  {n:'Leandro roberto mamedes da silva',c:'11264487967',d:'2026-05-04',v:80000,g:12180,q:7070},
  {n:'Denevaldo Rodrigues',c:'15515073827',d:'2026-05-05',v:100000,g:12180,q:8484},
  {n:'Mario Sérgio',c:'12889972720',d:'2026-05-07',v:80000,g:12180,q:1039},
  {n:'Marios Sérgio',c:'12889972720',d:'2026-05-07',v:80000,g:12180,q:5009},
  {n:'Mario Sérgio',c:'12889972720',d:'2026-05-07',v:80000,g:12180,q:9839},
  {n:'José Bruno',c:'61906948372',d:'2026-05-14',v:80000,g:12180,q:9394},
  {n:'Lucio Abílio',c:'66008158920',d:'2026-05-15',v:100000,g:12156,q:762},
  {n:'Ricardo Vicente Santana',c:'00443597138',d:'2026-05-15',v:100000,g:12153,q:8778},
  {n:'Jhony Pereira da SIlva Firmino',c:'20403049750',d:'2026-05-20',v:100000,g:12185,q:1155},
  {n:'Lucas Augusto Ramos Droique',c:'01329613260',d:'2026-05-22',v:100000,g:12185,q:762},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:1871},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:2290},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:2882},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:2965},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:2752},
  {n:'Carlos Fabiano Carvalho',c:'94980390463',d:'2026-05-26',v:100000,g:12185,q:3172},
  {n:'Leonaldo Costa Farias',c:'50944568220',d:'2026-05-26',v:100000,g:12185,q:3822},
  {n:'Erickson de Freitas Boscaine',c:'03317931990',d:'2026-05-30',v:140000,g:12185,q:8595},
]

const uid = 'fa53a6e0-4b50-4141-8e4b-dbdc2eb22da7'

const map = new Map()
for (const r of raw) {
  let key = r.c
  if (key === '37636706871') key = '37636706881'
  if (map.has(key)) {
    const e = map.get(key)
    e.v += r.v
    e.quotas.push(r.q)
  } else {
    map.set(key, { n: r.n, c: key, d: r.d, v: r.v, g: r.g, q: r.q, quotas: [r.q] })
  }
}

let ok = 0, fail = 0
for (const [, x] of map) {
  const extra = x.quotas.length > 1 ? x.quotas.slice(1).join(', ') : null
  const rec = {
    user_id: uid,
    name: x.n,
    cpf: x.c,
    phone: null,
    email: null,
    consortium_type: 'automovel',
    contract_value: x.v,
    grupo: x.g,
    cota: x.q,
    status: 'ativo',
    data_fechamento: x.d,
    criterio_de_lance: extra ? 'Cotas adicionais: ' + extra : null,
  }
  const { error } = await supabase.from('clients').insert(rec)
  if (error) { console.log('FAIL', x.n + ':', error.message); fail++ }
  else { console.log('OK', x.n); ok++ }
}
console.log(`\nDone: ${ok} inserted, ${fail} failed`)

