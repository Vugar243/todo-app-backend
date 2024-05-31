const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
const session = driver.session();

app.get('/tasks', async (req, res) => {
  try {
    const result = await session.run('MATCH (t:Task) RETURN t, id(t) as id');
    const tasks = result.records.map(record => {
      const task = record.get('t').properties;
      task.id = record.get('id').toInt(); // Преобразуем id в целое число
      return task;
    });
    res.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении списка задач:', error);
    res.status(500).send('Ошибка при получении списка задач');
  }
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  try {
    const result = await session.run('CREATE (t:Task {title: $title, completed: false}) RETURN t, id(t) as id', { title });
    const task = result.records[0].get('t').properties;
    task.id = result.records[0].get('id').toInt(); // Преобразуем id в целое число
    res.status(201).json(task);
  } catch (error) {
    console.error('Ошибка при добавлении новой задачи:', error);
    res.status(500).send('Ошибка при добавлении новой задачи');
  }
});


app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  try {
    const result = await session.run('MATCH (t:Task) WHERE id(t) = toInteger($id) SET t.completed = $completed RETURN t, id(t) as id', { id, completed });
    const task = result.records[0].get('t').properties;
    task.id = result.records[0].get('id').toInt(); // Преобразуем id в целое число
    res.json(task);
  } catch (error) {
    console.error('Ошибка при изменении статуса задачи:', error);
    res.status(500).send('Ошибка при изменении статуса задачи');
  }
});


app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Сначала получаем данные задачи
    const result = await session.run('MATCH (t:Task) WHERE id(t) = toInteger($id) RETURN t, id(t) as id', { id: parseInt(id, 10) });
    if (result.records.length === 0) {
      return res.status(404).send('Задача не найдена');
    }
    
    const task = result.records[0].get('t').properties;
    task.id = result.records[0].get('id').toInt(); // Преобразуем id в целое число

    // Удаляем задачу
    await session.run('MATCH (t:Task) WHERE id(t) = toInteger($id) DELETE t', { id: parseInt(id, 10) });

    // Возвращаем данные удаленной задачи
    res.status(200).json(task);
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).send('Ошибка при удалении задачи');
  }
});


app.listen(3000, () => {
  console.log('Сервер работает на http://localhost:3000');
});



