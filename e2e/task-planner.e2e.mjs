/**
 * End-to-end check of the Task Planner (Phase 1 spec, meeting note 2, Phase 1.5):
 * create a task, add a priority and a deadline, mark complete, remove completed
 * tasks from the active list; each person sees only their own tasks.
 */
import { assert, choose, click, hkDay, launch, notSeeText, open, pickDate, seeText, shot, signIn, step, summary } from './lib/harness.mjs'

const NEW = 'input[aria-label="New task"]'
const TODO = 'ul[aria-label="Tasks to do"]'
const DONE = 'ul[aria-label="Completed tasks"]'

/** The To do panel shows its count as a badge beside the title. */
async function toDoCount(page, n) {
  await page.waitForFunction(n => document.querySelectorAll('ul[aria-label="Tasks to do"] > li').length === n, { polling: 100 }, n)
}

async function addTask(page, title, { priority, due } = {}) {
  await page.type(NEW, title)
  if (priority) await choose(page, '#task-new-priority', `${priority} priority`)
  if (due) await pickDate(page, '#task-new-due', due)
  await click(page, 'Add task')
  await page.waitForFunction(t => document.querySelector('ul[aria-label="Tasks to do"]')?.innerText.includes(t), { polling: 100 }, title)
  await page.waitForFunction(sel => document.querySelector(sel).value === '', { polling: 100 }, NEW)
}

const titlesIn = (page, list) => page.$$eval(`${list} li p.text-sm`, els => els.map(e => e.innerText))
const dd = day => day.split('-').reverse().join('/')

const browser = await launch()
try {
  const { page } = await signIn(browser, 'staff@aa.test')

  await step(page, 'the sidebar offers the Task Planner and it starts empty', async () => {
    await open(page, '/')
    await click(page, 'Task Planner', 'nav, aside, [data-sidebar], body')
    await page.waitForFunction(() => location.pathname === '/tasks', { polling: 100 })
    await seeText(page, 'Your own to-do list. Only you can see these tasks.')
    await seeText(page, 'Nothing to do')
    await click(page, 'Add task')
    await seeText(page, 'Write what the task is first.')
  })

  await step(page, 'tasks are added with a priority and deadline and listed by deadline first', async () => {
    await addTask(page, 'Send Lucas the fee schedule', { priority: 'Low' })
    await addTask(page, 'Chase Brighton College for the offer letter', { priority: 'High', due: hkDay(1) })
    await addTask(page, 'Return the signed visa form', { due: hkDay(-2) })
    const order = await titlesIn(page, TODO)
    assert(order.join(' | ') === 'Return the signed visa form | Chase Brighton College for the offer letter | Send Lucas the fee schedule', `order was ${order.join(' | ')}`)
    await seeText(page, `Overdue · ${dd(hkDay(-2))}`, TODO)
    await seeText(page, 'Tomorrow', TODO)
    await seeText(page, '1 overdue')
    await toDoCount(page, 3)
    await shot(page, 'tasks-01-list')
  })

  await step(page, 'marking a task done moves it out of the active list into Completed', async () => {
    await page.click('button[aria-label="Mark \\"Return the signed visa form\\" as done"]')
    await page.waitForFunction(() => !document.querySelector('ul[aria-label="Tasks to do"]').innerText.includes('Return the signed visa form'), { polling: 100 })
    await toDoCount(page, 2)
    await notSeeText(page, 'overdue')
    await seeText(page, 'Completed (1)')
    await click(page, 'Completed (1)')
    await seeText(page, 'Return the signed visa form', DONE)
  })

  await step(page, 'a completed task can be put back on the active list', async () => {
    await page.click('button[aria-label="Mark \\"Return the signed visa form\\" as not done"]')
    await page.waitForFunction(() => document.querySelector('ul[aria-label="Tasks to do"]').innerText.includes('Return the signed visa form'), { polling: 100 })
    await toDoCount(page, 3)
  })

  await step(page, 'editing changes the wording, priority and deadline', async () => {
    await page.click('button[aria-label="Edit \\"Send Lucas the fee schedule\\""]')
    await seeText(page, 'Edit task', '[role="dialog"]')
    const input = await page.$('#task-edit-title')
    await input.evaluate(el => el.select())
    await input.type('Send Lucas the 2027 fee schedule')
    await choose(page, '#task-edit-priority', 'High priority')
    await new Promise(resolve => setTimeout(resolve, 500)) // the drawer slides in
    await pickDate(page, '#task-edit-due', hkDay(3))
    await click(page, 'Save task', '[role="dialog"]')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await seeText(page, 'Send Lucas the 2027 fee schedule', TODO)
    const order = await titlesIn(page, TODO)
    assert(order[2] === 'Send Lucas the 2027 fee schedule', `edited task should now sort by its deadline, order was ${order.join(' | ')}`)
  })

  await step(page, 'tasks are kept after a reload', async () => {
    await open(page, '/tasks')
    await toDoCount(page, 3)
    await seeText(page, 'Send Lucas the 2027 fee schedule', TODO)
  })

  await step(page, 'deleting asks first, and Keep leaves the task alone', async () => {
    await page.click('button[aria-label="Delete \\"Return the signed visa form\\""]')
    await seeText(page, 'Delete this task?', '[role="alertdialog"]')
    await click(page, 'Keep', '[role="alertdialog"]')
    await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'), { polling: 100 })
    await seeText(page, 'Return the signed visa form', TODO)
  })

  await step(page, 'deleting a task and clearing completed tasks remove them for good', async () => {
    await page.click('button[aria-label="Delete \\"Return the signed visa form\\""]')
    await click(page, 'Delete', '[role="alertdialog"]')
    await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]') && !document.body.innerText.includes('Return the signed visa form'), { polling: 100 })
    await new Promise(resolve => setTimeout(resolve, 300))
    await page.click('button[aria-label="Mark \\"Chase Brighton College for the offer letter\\" as done"]')
    await seeText(page, 'Completed (1)')
    await click(page, 'Completed (1)')
    await click(page, 'Clear completed')
    await seeText(page, 'Delete 1 completed task?', '[role="alertdialog"]')
    await click(page, 'Delete', '[role="alertdialog"]')
    await page.waitForFunction(() => !document.body.innerText.includes('Completed ('), { polling: 100 })
    await open(page, '/tasks')
    await toDoCount(page, 1)
    await notSeeText(page, 'Chase Brighton College')
  })

  // ---- Privacy: each person sees only their own list ----
  const junior = (await signIn(browser, 'junior@aa.test')).page
  await step(junior, 'a colleague sees only their own tasks, even with the lowest access', async () => {
    await open(junior, '/tasks')
    await seeText(junior, 'Nothing to do')
    await notSeeText(junior, 'Send Lucas the 2027 fee schedule')
    await addTask(junior, 'Book the Year 9 assessment room')
  })
  await step(page, 'and their tasks never appear on anyone else\'s list', async () => {
    await open(page, '/tasks')
    await notSeeText(page, 'Book the Year 9 assessment room')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
