const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../server");

let taskNumber = 0;

async function createTask({ completed = false, completionDate = null } = {}) {
  const response = await request(app).post("/tasks").send({
    title: `Task for test ${++taskNumber}`,
    date: "14/10/2026"
  });

  assert.equal(response.status, 201);

  const task = response.body;
  if (completed) {
    const storedTask = app.locals.taskStore.get(task.id);
    storedTask.completed = true;
    storedTask.completionDate = completionDate;
  }

  return task;
}

test("GET /tasks returns all tasks", async () => {
  const task = await createTask();
  const response = await request(app).get("/tasks");

  assert.equal(response.status, 200);
  assert.ok(response.body.some((listedTask) => listedTask.id === task.id));
});

test("GET /tasks/:id returns a specific task", async () => {
  const task = await createTask();
  const response = await request(app).get(`/tasks/${task.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, task.id);
  assert.equal(response.body.title, task.title);
});

test("GET /tasks/:id returns 404 for non-existent task", async () => {
  const response = await request(app).get(`/tasks/${Number.MAX_SAFE_INTEGER}`);

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});

test("PATCH /tasks/:id/reopen marks a task as pending and clears its completion date", async () => {
  const task = await createTask({ completed: true, completionDate: "13/10/2026" });
  const response = await request(app).patch(`/tasks/${task.id}/reopen`);

  assert.equal(response.status, 200);
  assert.equal(response.body.completed, false);
  assert.equal(response.body.completionDate, null);
});

test("PATCH /tasks/:id/reopen returns 404 for a non-existent task", async () => {
  const response = await request(app).patch(`/tasks/${Number.MAX_SAFE_INTEGER}/reopen`);

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});

test("PATCH /tasks/:id/completion-date updates the completion date", async () => {
  const task = await createTask();
  const response = await request(app)
    .patch(`/tasks/${task.id}/completion-date`)
    .send({ completionDate: "14/10/2026" });

  assert.equal(response.status, 200);
  assert.equal(response.body.completionDate, "14/10/2026");
  assert.equal(response.body.title, task.title);
});

test("PATCH /tasks/:id/completion-date clears the completion date with null", async () => {
  const task = await createTask();
  const response = await request(app)
    .patch(`/tasks/${task.id}/completion-date`)
    .send({ completionDate: null });

  assert.equal(response.status, 200);
  assert.equal(response.body.completionDate, null);
});

test("PATCH /tasks/:id/completion-date returns 400 for a missing date", async () => {
  const task = await createTask();
  const response = await request(app)
    .patch(`/tasks/${task.id}/completion-date`)
    .send({});

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: "A valid completionDate is required" });
});

test("PATCH /tasks/:id/completion-date returns 404 for a non-existent task", async () => {
  const response = await request(app)
    .patch(`/tasks/${Number.MAX_SAFE_INTEGER}/completion-date`)
    .send({ completionDate: "14/10/2026" });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});

test("POST /tasks creates a new task", async () => {
  const newTask = {
    title: `Task for test ${++taskNumber}`,
    date: "14/10/2026"
  };

  const response = await request(app).post("/tasks").send(newTask);

  assert.equal(response.status, 201);
  assert.equal(response.body.title, newTask.title);
  assert.equal(response.body.completed, false);
  assert.equal(response.body.date, newTask.date);
  assert.equal(response.body.completionDate, null);
});  

test("DELETE /tasks/:id removes an existing task", async () => {
  const task = await createTask();
  const response = await request(app).delete(`/tasks/${task.id}`);

  assert.equal(response.status, 200);

  const deletedTask = await request(app).get(`/tasks/${task.id}`);
  assert.equal(deletedTask.status, 404);
  assert.deepEqual(deletedTask.body, { error: "Task not found" });
});

test("DELETE /tasks/:id does not remove a completed task", async () => {
  const task = await createTask({ completed: true, completionDate: "13/10/2026" });
  const response = await request(app).delete(`/tasks/${task.id}`);

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: "Cannot delete a completed task" });

  const completedTask = await request(app).get(`/tasks/${task.id}`);
  assert.equal(completedTask.status, 200);
  assert.equal(completedTask.body.completed, true);
});

test("DELETE /tasks/:id returns 404 for a non-existent task", async () => {
  const response = await request(app).delete(`/tasks/${Number.MAX_SAFE_INTEGER}`);

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});