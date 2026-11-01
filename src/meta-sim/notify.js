// Ce qui est arrivé pendant qu'on regardait ailleurs.
//
// POURQUOI. L'app a sept écrans. Un marchand qui prépare une page ne voit
// pas qu'un client vient de commenter, qu'une campagne a dépassé son coût
// cible, qu'une story programmée est partie. Les pastilles du rail disent
// « il y a 3 choses » ; elles ne disent jamais LESQUELLES, ni quand, ni
// quoi faire. Une pastille sans récit, on apprend à l'ignorer.
//
// Les notifications sont donc des ÉVÉNEMENTS datés, avec une cible : on
// clique, on arrive sur la chose. Et elles sont lues par l'agent dans son
// briefing, ce qui est l'intérêt réel — il peut ouvrir un tour par « pendant
// que tu préparais la page, deux personnes ont demandé la pointure 43 ».
//
// ⚠️ Comme tout ce qui vient de meta-sim : simulé, et marqué comme tel
// partout où ça s'affiche.
import { all, one, run, insert, now } from '../db.js'

run(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  session TEXT NOT NULL,
  kind TEXT NOT NULL,        -- comment | message | campaign | post | order
  title TEXT NOT NULL,
  body TEXT,
  goto TEXT,                 -- l'écran à ouvrir : chat | inbox | campaigns | meta | sites
  ref INTEGER,               -- l'identifiant de la chose, dans sa table
  seen INTEGER DEFAULT 0,
  at INTEGER NOT NULL
)`)

/**
 * Pose une notification.
 *
 * `dedupe` évite le harcèlement : relire la même boîte de réception trois
 * fois ne doit pas poser trois fois « 4 clients attendent ». On écrase la
 * précédente du même genre et de la même cible si elle n'a pas été vue.
 */
export function push(sessionId, { kind, title, body = null, goto = null, ref = null, dedupe = true }) {
  if (!sessionId || !kind || !title) return null
  if (dedupe) {
    const deja = one(
      'SELECT id FROM notifications WHERE session=? AND kind=? AND IFNULL(ref,-1)=IFNULL(?,-1) AND seen=0',
      sessionId, kind, ref ?? null)
    if (deja) {
      run('UPDATE notifications SET title=?, body=?, goto=?, at=? WHERE id=?',
        title, body, goto, now(), deja.id)
      return deja.id
    }
  }
  return insert(
    'INSERT INTO notifications(session,kind,title,body,goto,ref,seen,at) VALUES(?,?,?,?,?,?,0,?)',
    sessionId, kind, title, body, goto, ref, now())
}

export const feed = (sessionId, limit = 20) =>
  all('SELECT * FROM notifications WHERE session=? ORDER BY id DESC LIMIT ?', sessionId, limit)

export const unseen = (sessionId) =>
  one('SELECT COUNT(*) n FROM notifications WHERE session=? AND seen=0', sessionId)?.n ?? 0

export const markSeen = (sessionId, id = null) => {
  if (id) run('UPDATE notifications SET seen=1 WHERE session=? AND id=?', sessionId, id)
  else run('UPDATE notifications SET seen=1 WHERE session=?', sessionId)
  return unseen(sessionId)
}

/** Les trois dernières non vues, en une phrase, pour le briefing de l'agent. */
export const digest = (sessionId) => {
  const n = all(
    'SELECT kind,title,at FROM notifications WHERE session=? AND seen=0 ORDER BY id DESC LIMIT 3', sessionId)
  return n.length ? n.map((x) => x.title) : []
}
