// Configurações do servidor HTTP (usando o framework Express.js)
const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());
app.set("json spaces", 2);

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Banco de dados de tarefas. Nesta versão, as tarefas estão salvas em memória volátil. 
const tasks = new Map([
  [1, {
    id: 1,
    title: "Revisar o artigo ACM Survey",
    completed: false,
    date: "15/10/2026",
    completionDate: null
  }],
  [2, {
    id: 2,
    title: "Preparar material para o curso TDS",
    completed: true,
    date: "12/10/2026",
    completionDate: "10/10/2026"
  }],
  [3, {
    id: 3,
    title: "Preparar apresentação da palestra BBDW",
    completed: false,
    date: "15/10/2026",
    completionDate: null
  }]
]);

app.locals.taskStore = tasks;

// GET /tasks - "endpoint" que recupera todas as tarefas.
app.get("/tasks", (req, res) => {
  const allTasks = [];
  for (const task of tasks.values()) {
    allTasks.push(task);
  }
  res.json(allTasks);
});

// GET /tasks/:id - "endpoint" que recupera uma tarefa específica pelo ID.
app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});

app.patch("/tasks/:id/completion-date", (req, res) => {
  /* #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            completionDate: {
              type: 'string',
              nullable: true,
              example: '14/10/2026'
            }
          },
          required: ['completionDate']
        }
      }
    }
  } */
  const id = Number(req.params.id);
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const completionDate = req.body?.completionDate;
  if (completionDate !== null && (typeof completionDate !== "string" || !completionDate.trim())) {
    return res.status(400).json({ error: "A valid completionDate is required" });
  }

  task.completionDate = completionDate;
  res.json(task);
});

app.patch("/tasks/:id/reopen", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.completed = false;
  task.completionDate = null;
  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (task.completed) {
    return res.status(400).json({ error: "Cannot delete a completed task" });
  }

  tasks.delete(id);
  res.status(200).end();
});

app.post("/tasks", (req, res) => {
  const { title, date } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: "Title and date are required" });
  }

  const newId = tasks.size + 1;  //TODO: Melhorar a geração de IDs para evitar colisões em um cenário real.
  const newTask = {
    id: newId,
    title,
    completed: false,
    date,
    completionDate: null
  };
  
  tasks.set(newId, newTask);
  res.status(201).json(newTask);
});

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}


module.exports = app;