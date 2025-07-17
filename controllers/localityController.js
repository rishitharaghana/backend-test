const pool = require('../config/db');
const util = require('util');

const queryAsync = util.promisify(pool.query).bind(pool);

const getStates = async (req, res) => {
  try {
    const rows = await queryAsync('SELECT state_id, state_name FROM states_table ORDER BY state_name');
    const states = rows.map(row => ({
      value: row.state_id,
      label: row.state_name
    }));
    res.status(200).json({
      status: 'success',
      message: 'States fetched successfully',
      states
    });
  } catch (error) {
   
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch states: ' + error.message,
      states: []
    });
  }
};

const getCitiesByState = async (req, res) => {
  const { stateId } = req.params;
  if (!stateId || isNaN(parseInt(stateId))) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid stateId is required',
      cities: []
    });
  }
  try {
    const rows = await queryAsync(
      'SELECT city_id, city_name FROM cities_table WHERE state_id = ? ORDER BY city_name',
      [parseInt(stateId)]
    );
    const cities = rows.map(row => ({
      value: row.city_id,
      label: row.city_name
    }));
    res.status(200).json({
      status: 'success',
      message: 'Cities fetched successfully',
      cities
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cities: ' + error.message,
      cities: []
    });
  }
};

module.exports = { getStates,getCitiesByState };