const recordService = require("../services/recordService");

async function listRecords(req, res) {
  try {
    const { page, limit, type, category, from, to, search } = req.query;
    const result = recordService.listRecords({
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      type,
      category,
      from,
      to,
      search,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getRecord(req, res) {
  try {
    const record = recordService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found." });
    return res.status(200).json(record);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createRecord(req, res) {
  try {
    const record = recordService.createRecord(req.body, req.user.id);
    return res.status(201).json(record);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function updateRecord(req, res) {
  try {
    const record = recordService.updateRecord(req.params.id, req.body);
    return res.status(200).json(record);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function deleteRecord(req, res) {
  try {
    const result = recordService.deleteRecord(req.params.id, true); // soft delete
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
