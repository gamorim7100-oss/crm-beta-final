import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://auuajtpczenwuopduamb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dWFqdHBjemVud3VvcGR1YW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE4MzA0NiwiZXhwIjoyMDk1NzU5MDQ2fQ.Bi5OhLSO8VMkmGsj-V4kKevGlH_6UV4qRTKOw2Et2Dc'
)

// name/identifier -> phone (raw)
const phones = [
  { name: 'Lucilene', cpf: '87596857191', phone: '67991041911' },
  { name: 'Milena', cpf: '04775574574', phone: '71997208677' },
  { name: 'Guilherme', cpf: '45068164801', phone: '13996199017' },
  { name: 'Valéria', cpf: '05096878309', phone: '88992299782' },
  { name: 'Lais', cpf: '37636706881', phone: '63984378756' },
  { name: 'Anael', cpf: '00687066344', phone: '99991969254' },
  { name: 'Rafaella', cpf: '91886198268', phone: '92996129749' },
  { name: 'Eduardo', cpf: '40520470877', phone: '11986269335' },
  { name: 'deneval', cpf: '15515073827', phone: '11992292694' },
  { name: 'Mário', cpf: '12889972720', phone: '28999969286' },
  { name: 'José', cpf: '61906948372', phone: '99991078757' },
  { name: 'Lúcio', cpf: '66008158920', phone: '48996099759' },
  { name: 'Ricardo', cpf: '00443597138', phone: '67992624330' },
  { name: 'Jhony', cpf: '20403049750', phone: '24999963114' },
  { name: 'Lucas', cpf: '01329613260', phone: '69984255437' },
  { name: 'Carlos', cpf: '94980390463', phone: '81998807100' },
  { name: 'Leonaldo', cpf: '50944568220', phone: '91982580509' },
  { name: 'Erickson', cpf: '03317931990', phone: '67993476731' },
  { name: 'Gabriel', cpf: '11685186955', phone: '48988686355' },
  { name: 'Leandro', cpf: '11264487967', phone: '48991039927' },
  { name: 'Marcos', cpf: '09378379702', phone: '38999192589' },
]

let ok = 0, fail = 0
for (const p of phones) {
  const { data, error } = await supabase
    .from('clients')
    .update({ phone: p.phone })
    .eq('cpf', p.cpf)
    .select()
  if (error) { console.log('FAIL', p.name + ':', error.message); fail++ }
  else if (!data || data.length === 0) { console.log('NOT FOUND', p.name); fail++ }
  else { console.log('OK', p.name, '->', p.phone); ok++ }
}
console.log(`\nDone: ${ok} updated, ${fail} failed`)

