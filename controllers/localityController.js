const pool = require('../config/db');
const util = require('util');

const queryAsync = util.promisify(pool.query).bind(pool);

const getStates = async (req, res) => {
  try {
    const rows = await queryAsync('SELECT state_id, state_name FROM states_table ORDER BY state_name');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
};

const getCitiesByState = async (req, res) => {
  const { stateId } = req.params;
  try {
    const rows = await queryAsync(
      'SELECT city_id, city_name FROM cities_table WHERE state_id = ? ORDER BY city_name',
      [stateId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

module.exports = { getStates,getCitiesByState };