require("dotenv").config();
const express = require('express');
const mysql = require('mysql2');
const moment = require('moment');
const cors = require("cors");

const app = express();
//const port = 3360;
const PORT = process.env.PORT || 3360;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(cors()); // Allow requests from frontend

// MySQL connection for BASE_LOOM
const dbLoom = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_LOOM_DB,
});

// MySQL connection for BASE_L_MONTH
const dbMonth = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_MONTH_DB,
});

// Handle MySQL connection errors
dbLoom.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to BASE_LOOM database:", err.message);
  } else {
    console.log("✅ Connected to BASE_LOOM database.");
  }
});

dbMonth.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to BASE_L_MONTH database:", err.message);
  } else {
    console.log("✅ Connected to BASE_L_MONTH database.");
  }
});



// MySQL connection for BASE_LOOM
//const dbLoom = mysql.createConnection({
//    host: '184.168.101.160', // Your MySQL host
//    user: 'datalogsa',       // MySQL username
//    password: 'datalog',     // MySQL password
//    database: 'BASE_LOOM',   // Your BASE_LOOM database name
//});

// MySQL connection for BASE_L_MONTH
//const dbMonth = mysql.createConnection({
//    host: '184.168.101.160', // Your MySQL host
//    user: 'datalogsa',       // MySQL username
//    password: 'datalog',     // MySQL password
//    database: 'BASE_L_MONTH', // Your BASE_L_MONTH database name
//});







// PRODUCTION K.PICKS
const getCurrentShiftProdKPicks = (req, res) => {
    dbLoom.query('SELECT SUM(PICKS) AS totalPicks FROM CURPROD', (err, results) => {
        if (err) {
            console.error('Error fetching total PICKS from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        const totalPicks = results[0].totalPicks || 0;
        const totalKPicks = (totalPicks / 1000).toFixed(2);
        
        return res.json({
            prodKPicks: parseFloat(totalKPicks)
        });
    });
};

const getPreviousShiftProdKPicks = (req, res) => {
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT from CURPROD:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const shift = results[0].SHIFT;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            let targetDate, targetShift;

            // Determine the correct date and shift
            if (shift === 1) {
                targetDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
                targetShift = 2;
            } else if (shift === 2) {
                targetDate = moment(sdate).format('YYYY-MM-DD');
                targetShift = 1;
            } else {
                return res.status(400).json({ error: 'Invalid SHIFT value in CURPROD' });
            }

            // Query to fetch PICKS for the previous shift
            const query = `SELECT SUM(PICKS) AS totalPicks FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`;

            dbMonth.query(query, [targetDate, targetShift], (err, results) => {
                if (err) {
                    console.error('Error fetching previous shift data:', err.stack);
                    return res.status(500).json({ error: 'Database query failed' });
                }

                const totalPicks = results[0].totalPicks || 0;
                const totalKPicks = (totalPicks / 1000).toFixed(2);

                return res.json({
                    previousShiftProdKPicks: parseFloat(totalKPicks)
                });
            });
        } else {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }
    });
};

const getYesterdayProdKPicks = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            const prodTableName = `PROD_${monthYear}`;

            dbMonth.query(`SELECT SUM(PICKS) AS totalPicks FROM \`${prodTableName}\` WHERE SDATE = ?`, [yesterday], (err, results) => {
                if (err) {
                    console.error('Error fetching data from the PROD table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching production' });
                }

                const totalPicks = results[0].totalPicks || 0;
                const totalKPicks = (totalPicks / 1000).toFixed(2);

                return res.json({
                    yesterdayProdKPicks: parseFloat(totalKPicks)
                });
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getCurrentMonthProdKPicks = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            dbMonth.query(`SELECT SUM(PICKS) AS totalPicks FROM \`${prodTableName}\` WHERE SDATE LIKE ?`, [`${moment(sdate).format('YYYY-MM')}%`], (err, results) => {
                if (err) {
                    console.error('Error fetching data from the PROD table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching production' });
                }

                const totalPicks = results[0].totalPicks || 0;
                const totalKPicks = (totalPicks / 1000).toFixed(2);

                return res.json({
                    monthProdKPicks: parseFloat(totalKPicks)
                });
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getOldProdKPicksData = async (req, res) => {
    try {
        // Step 1: Fetch the latest date and shift from CURPROD table
        const [results] = await dbLoom.promise().query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1');
        if (results.length === 0) {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = results[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Calculate target date/shift for previous shift
        let targetDate, targetShift;
        if (shift === 1) {
            targetDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            targetShift = 2;
        } else if (shift === 2) {
            targetDate = moment(sdate).format('YYYY-MM-DD');
            targetShift = 1;
        } else {
            return res.status(400).json({ error: 'Invalid SHIFT value in CURPROD' });
        }

        // Prepare the pattern for the current month's data
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Single query to fetch all the required data (previous shift, yesterday, and current month)
        const combinedQuery = `
            SELECT
                SUM(CASE WHEN DATE(SDATE) = ? AND SHIFT = ? THEN PICKS ELSE 0 END) AS previousShift,
                SUM(CASE WHEN SDATE = ? THEN PICKS ELSE 0 END) AS yesterday,
                SUM(CASE WHEN SDATE LIKE ? THEN PICKS ELSE 0 END) AS currentMonth
            FROM \`${prodTableName}\`
        `;

        // Execute the combined query
        const [resultsData] = await dbMonth.promise().query(combinedQuery, [targetDate, targetShift, targetDate, monthPattern]);

        // Prepare the response object
        const response = {
            previousShift: ((resultsData[0]?.previousShift || 0) / 1000).toFixed(2),
            yesterday: ((resultsData[0]?.yesterday || 0) / 1000).toFixed(2),
            currentMonth: ((resultsData[0]?.currentMonth || 0) / 1000).toFixed(2),
        };

        // Send response
        res.json(response);
    } catch (error) {
        console.error('Error fetching old production KPicks data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching old production KPicks data.' });
    }
};



// PRODUCTION METER
const getCurrentShiftProdMeter = (req, res) => {
    const query = `
        SELECT 
            SUM(CURPROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)) AS total_production_length
        FROM CURPROD
        JOIN MACHINE ON CURPROD.MACHINE_ID = MACHINE.MACHINE_ID
        JOIN STDSTYLE ON CURPROD.STYLE_ID = STDSTYLE.STYLE_ID
    `;

    dbLoom.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching production:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        const totalMeter = Number(results[0]?.total_production_length) || 0;
        const roundedMeter = parseFloat(totalMeter.toFixed(2));

        return res.json({
            prodMeter: roundedMeter
        });
    });
};

const getPreviousShiftProdMeter = (req, res) => {
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT from CURPROD:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const shift = results[0].SHIFT;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            let targetDate, targetShift;

            // Determine the correct date and shift
            if (shift === 1) {
                targetDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
                targetShift = 2;
            } else if (shift === 2) {
                targetDate = moment(sdate).format('YYYY-MM-DD');
                targetShift = 1;
            } else {
                return res.status(400).json({ error: 'Invalid SHIFT value in CURPROD' });
            }

            // Query to calculate production in meters for previous shift
            const query = `
                SELECT 
                    SUM(
                        PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)
                    ) AS total_production_length
                FROM \`${prodTableName}\` AS PROD
                JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
                JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
                WHERE DATE(PROD.SDATE) = ? AND PROD.SHIFT = ?
            `;

            dbMonth.query(query, [targetDate, targetShift], (err, results) => {
                if (err) {
                    console.error('Error fetching previous shift data:', err.stack);
                    return res.status(500).json({ error: 'Database query failed' });
                }

                const totalMeter = Number(results[0]?.total_production_length) || 0;
                const roundedMeter = parseFloat(totalMeter.toFixed(2));

                return res.json({
                    previousShiftProdMeter: roundedMeter
                });
            });
        } else {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }
    });
};

const getYesterdayProdMeter = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            const prodTableName = `PROD_${monthYear}`;

            const query = `
                SELECT 
                    SUM(
                        PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)
                    ) AS total_production_length
                FROM \`${prodTableName}\` AS PROD
                JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
                JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
                WHERE PROD.SDATE = ?
            `;

            dbMonth.query(query, [yesterday], (err, results) => {
                if (err) {
                    console.error('Error fetching data from the PROD table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching production' });
                }

                const totalMeter = Number(results[0]?.total_production_length) || 0;
                const roundedMeter = parseFloat(totalMeter.toFixed(2));

                return res.json({
                    yesterdayProdMeter: roundedMeter
                });
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getCurrentMonthProdMeter = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            const query = `
                SELECT 
                    SUM(
                        PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)
                    ) AS total_production_length
                FROM \`${prodTableName}\` AS PROD
                JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
                JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
                WHERE PROD.SDATE LIKE ?
            `;

            dbMonth.query(query, [`${moment(sdate).format('YYYY-MM')}%`], (err, results) => {
                if (err) {
                    console.error('Error fetching data from the PROD table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching production' });
                }

                const totalMeter = Number(results[0]?.total_production_length) || 0;
                const roundedMeter = parseFloat(totalMeter.toFixed(2));

                return res.json({
                    monthProdMeter: roundedMeter
                });
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getOldProdMeterData = (req, res) => {
    // Step 1: Fetch the latest SDATE and SHIFT
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT from CURPROD:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = results[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Calculate target date/shift for previous shift
        let targetDate, targetShift;
        if (shift === 1) {
            targetDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            targetShift = 2;
        } else if (shift === 2) {
            targetDate = moment(sdate).format('YYYY-MM-DD');
            targetShift = 1;
        } else {
            return res.status(400).json({ error: 'Invalid SHIFT value in CURPROD' });
        }

        // Initialize response object
        let response = {
            previousShift: 0,
            yesterday: 0,
            currentMonth: 0
        };

        // Query 1: Previous shift production in meters
        const previousShiftQuery = `
            SELECT 
                SUM(PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)) AS total_production_length
            FROM \`${prodTableName}\` AS PROD
            JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
            JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
            WHERE DATE(PROD.SDATE) = ? AND PROD.SHIFT = ?
        `;
        dbMonth.query(previousShiftQuery, [targetDate, targetShift], (err, prevResults) => {
            if (err) {
                console.error('Error fetching previous shift data:', err.stack);
                return res.status(500).json({ error: 'Database query failed for previous shift' });
            }
            response.previousShift = parseFloat((Number(prevResults[0]?.total_production_length) || 0).toFixed(2));

            // Query 2: Yesterday's production in meters
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            const yesterdayQuery = `
                SELECT 
                    SUM(PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)) AS total_production_length
                FROM \`${prodTableName}\` AS PROD
                JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
                JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
                WHERE PROD.SDATE = ?
            `;
            dbMonth.query(yesterdayQuery, [yesterday], (err, yestResults) => {
                if (err) {
                    console.error('Error fetching yesterday data:', err.stack);
                    return res.status(500).json({ error: 'Database query failed for yesterday' });
                }
                response.yesterday = parseFloat((Number(yestResults[0]?.total_production_length) || 0).toFixed(2));

                // Query 3: Current month's production in meters
                const monthQuery = `
                    SELECT 
                        SUM(PROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)) AS total_production_length
                    FROM \`${prodTableName}\` AS PROD
                    JOIN BASE_LOOM.MACHINE ON PROD.MACHINE_ID = MACHINE.MACHINE_ID
                    JOIN BASE_LOOM.STDSTYLE ON PROD.STYLE_ID = STDSTYLE.STYLE_ID
                    WHERE PROD.SDATE LIKE ?
                `;
                const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;
                dbMonth.query(monthQuery, [monthPattern], (err, monthResults) => {
                    if (err) {
                        console.error('Error fetching month data:', err.stack);
                        return res.status(500).json({ error: 'Database query failed for month' });
                    }
                    response.currentMonth = parseFloat((Number(monthResults[0]?.total_production_length) || 0).toFixed(2));

                    // All queries completed; send response
                    res.json(response);
                });
            });
        });
    });
};





// ACTUAL EFFICIENCY
const getCurrentShiftActualEfficiency = (req, res) => {
    // Fetch all entries from CURPROD table to sum up RTIME, PSTIME, and NPSTIME
    dbLoom.query('SELECT RTIME, PSTIME, NPSTIME FROM CURPROD', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching data from CURPROD table' });
        }

        // Initialize variables to hold the sums
        let totalRTIME = 0;
        let totalPSTIME = 0;
        let totalNPSTIME = 0;

        // Iterate through each entry and sum the values
        results.forEach(row => {
            totalRTIME += Number(row.RTIME) || 0;
            totalPSTIME += Number(row.PSTIME) || 0;
            totalNPSTIME += Number(row.NPSTIME) || 0;
        });

        // Calculate the total time (RTIME + PSTIME + NPSTIME)
        const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;

        // Calculate the actual efficiency
        let actualEfficiency = 0;
        if (totalTime > 0) {
            actualEfficiency = (totalRTIME / totalTime) * 100;
        }

        // Return the result with two decimal places
        return res.json({
            actualEfficiency: parseFloat(actualEfficiency.toFixed(2))
        });
    });
};

const getPreviousShiftActualEfficiency = (req, res) => {
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching data from CURPROD table' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const shift = results[0].SHIFT;

            // Extract the month and year from SDATE
            const monthYear = moment(sdate).format('MMYYYY');
            const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            const prodTableName = `PROD_${monthYear}`;

            let previousShift;
            if (shift === 1) {
                previousShift = 2;  // If current shift is 1, look for shift 2
            } else if (shift === 2) {
                previousShift = 1;  // If current shift is 2, look for shift 1
            }

            // Query to get the previous shift data
            const query = `
                SELECT RTIME, PSTIME, NPSTIME
                FROM \`${prodTableName}\`
                WHERE DATE(SDATE) = ? AND SHIFT = ?
            `;

            dbMonth.query(query, [previousShiftDate, previousShift], (err, results) => {
                if (err) {
                    console.error('Error fetching data from PROD table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching production data' });
                }

                if (results.length > 0) {
                    let totalRTIME = 0;
                    let totalPSTIME = 0;
                    let totalNPSTIME = 0;

                    results.forEach(row => {
                        totalRTIME += Number(row.RTIME) || 0;
                        totalPSTIME += Number(row.PSTIME) || 0;
                        totalNPSTIME += Number(row.NPSTIME) || 0;
                    });

                    const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;

                    let efficiency = 0;
                    if (totalTime > 0) {
                        efficiency = (totalRTIME / totalTime) * 100;
                    }

                    return res.json({
                        previousShiftActualEfficiency: parseFloat(efficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No previous shift data found' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No data found in CURPROD table' });
        }
    });
};

const getYesterdayActualEfficiency = (req, res) => {
    // Fetch the latest entry in the CURPROD table to get the current date
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching production data' });
        }

        if (results.length > 0) {
            // Extract the SDATE value from the result
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');  // Format the month and year as MMYYYY
            const prodTableName = `PROD_${monthYear}`;  // Construct the PROD_MMYY table name dynamically

            // Get yesterday's date by subtracting one day from the current SDATE
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');  // Format as YYYY-MM-DD

            // Query the PROD_MMYY table for yesterday's date to sum up RTIME, PSTIME, and NPSTIME
            dbMonth.query(`
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME, SUM(NPSTIME) AS totalNPSTIME
                FROM \`${prodTableName}\`
                WHERE SDATE = ?
            `, [yesterday], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching production data for yesterday' });
                }

                if (results.length > 0) {
                    // Get the sum of RTIME, PSTIME, and NPSTIME values for yesterday
                    const totalRTIME = Number(results[0].totalRTIME) || 0;  // Explicitly convert to number
                    const totalPSTIME = Number(results[0].totalPSTIME) || 0;  // Explicitly convert to number
                    const totalNPSTIME = Number(results[0].totalNPSTIME) || 0;  // Explicitly convert to number

                    // Calculate the actual efficiency
                    const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
                    let actualEfficiency = 0;

                    if (totalTime > 0) {
                        actualEfficiency = (totalRTIME / totalTime) * 100;
                    }

                    // Return the result with two decimal places in the desired format
                    return res.json({
                        yesterdayActualEfficiency: parseFloat(actualEfficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for yesterday in PROD_MMYY table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getCurrentMonthActualEfficiency = (req, res) => {
    // Fetch the latest entry in the CURPROD table to get the current month and year
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching production data' });
        }

        if (results.length > 0) {
            // Extract the SDATE value from the result
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');  // Format the month and year as MMYYYY
            const prodTableName = `PROD_${monthYear}`;  // Construct the PROD_MMYY table name dynamically

            // Query the PROD_MMYY table for the current month to sum up RTIME, PSTIME, and NPSTIME
            dbMonth.query(`
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME, SUM(NPSTIME) AS totalNPSTIME
                FROM \`${prodTableName}\`
            `, (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching production data' });
                }

                if (results.length > 0) {
                    // Get the sum of RTIME, PSTIME, and NPSTIME values
                    const totalRTIME = Number(results[0].totalRTIME) || 0;  // Explicitly convert to number
                    const totalPSTIME = Number(results[0].totalPSTIME) || 0;  // Explicitly convert to number
                    const totalNPSTIME = Number(results[0].totalNPSTIME) || 0;  // Explicitly convert to number

                    // Calculate the actual efficiency
                    const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
                    let actualEfficiency = 0;

                    if (totalTime > 0) {
                        actualEfficiency = (totalRTIME / totalTime) * 100;
                    }

                    // Return the result with two decimal places in the desired format
                    return res.json({
                        monthActualEfficiency: parseFloat(actualEfficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for the current month in PROD_MMYY table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getOldActualEfficiencyData = (req, res) => {
    // Step 1: Fetch the latest SDATE and SHIFT
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = results[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Determine previous shift
        let previousShift = shift === 1 ? 2 : 1;

        // Initialize response object
        let response = {
            previousShift: '0%',
            yesterday: '0%',
            currentMonth: '0%'
        };

        // Query 1: Previous shift efficiency
        const previousShiftQuery = `
            SELECT RTIME, PSTIME, NPSTIME
            FROM \`${prodTableName}\`
            WHERE DATE(SDATE) = ? AND SHIFT = ?
        `;
        dbMonth.query(previousShiftQuery, [previousShiftDate, previousShift], (err, prevResults) => {
            if (err) {
                console.error('Error fetching previous shift efficiency:', err.stack);
                return res.status(500).json({ error: 'Database query failed for previous shift' });
            }

            let totalRTIME = 0, totalPSTIME = 0, totalNPSTIME = 0;
            prevResults.forEach(row => {
                totalRTIME += Number(row.RTIME) || 0;
                totalPSTIME += Number(row.PSTIME) || 0;
                totalNPSTIME += Number(row.NPSTIME) || 0;
            });
            const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
            response.previousShift = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

            // Query 2: Yesterday's efficiency
            const yesterdayQuery = `
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME, SUM(NPSTIME) AS totalNPSTIME
                FROM \`${prodTableName}\`
                WHERE SDATE = ?
            `;
            dbMonth.query(yesterdayQuery, [yesterday], (err, yestResults) => {
                if (err) {
                    console.error('Error fetching yesterday efficiency:', err.stack);
                    return res.status(500).json({ error: 'Database query failed for yesterday' });
                }

                const totalRTIME = Number(yestResults[0]?.totalRTIME) || 0;
                const totalPSTIME = Number(yestResults[0]?.totalPSTIME) || 0;
                const totalNPSTIME = Number(yestResults[0]?.totalNPSTIME) || 0;
                const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
                response.yesterday = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

                // Query 3: Current month efficiency
                const monthQuery = `
                    SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME, SUM(NPSTIME) AS totalNPSTIME
                    FROM \`${prodTableName}\`
                    WHERE SDATE LIKE ?
                `;
                dbMonth.query(monthQuery, [monthPattern], (err, monthResults) => {
                    if (err) {
                        console.error('Error fetching month efficiency:', err.stack);
                        return res.status(500).json({ error: 'Database query failed for month' });
                    }

                    const totalRTIME = Number(monthResults[0]?.totalRTIME) || 0;
                    const totalPSTIME = Number(monthResults[0]?.totalPSTIME) || 0;
                    const totalNPSTIME = Number(monthResults[0]?.totalNPSTIME) || 0;
                    const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
                    response.currentMonth = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

                    // Send the combined response
                    res.json(response);
                });
            });
        });
    });
};





// PRODUCTION EFFICIENCY
const getCurrentShiftProductionEfficiency = (req, res) => {
    // SQL query to fetch RTIME, PSTIME, and MCNAME from CURPROD and MACHINE tables
    const query = `
        SELECT 
            c.RTIME, 
            c.PSTIME, 
            m.MCNAME
        FROM CURPROD c
        JOIN MACHINE m ON c.MACHINE_ID = m.MACHINE_ID
    `;

    dbLoom.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching efficiency data:', err.stack);
            return res.status(500).json({ error: 'Error fetching efficiency data' });
        }

        // If no results are found
        if (results.length === 0) {
            return res.status(404).json({ error: 'No matching entries found' });
        }

        let totalRTIME = 0;
        let totalPSTIME = 0;
        
        // Loop through results to sum RTIME and PSTIME
        results.forEach(row => {
            const { RTIME, PSTIME } = row;
            
            totalRTIME += RTIME || 0;  // Fallback to 0 if RTIME is null
            totalPSTIME += PSTIME || 0;  // Fallback to 0 if PSTIME is null
        });

        // Calculate production efficiency
        if (totalRTIME + totalPSTIME > 0) {
            const efficiency = (totalRTIME / (totalRTIME + totalPSTIME)) * 100;
            return res.json({
                productionEfficiency: parseFloat(efficiency.toFixed(2))  // Round to 2 decimal places
            });
        } else {
            return res.json({
                productionEfficiency: '0.00'  // If no time is available, return 0%
            });
        }
    });
};

const getPreviousShiftProductionEfficiency = (req, res) => {
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching data from CURPROD table' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const shift = results[0].SHIFT;

            // Extract the month and year from SDATE
            const monthYear = moment(sdate).format('MMYYYY');
            const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
            const prodTableName = `PROD_${monthYear}`;

            let previousShift;
            if (shift === 1) {
                previousShift = 2;  // If current shift is 1, look for shift 2
            } else if (shift === 2) {
                previousShift = 1;  // If current shift is 2, look for shift 1
            }

            // Query to get the previous shift data (RTIME and PSTIME)
            const query = `
                SELECT RTIME, PSTIME
                FROM \`${prodTableName}\`
                WHERE DATE(SDATE) = ? AND SHIFT = ?
            `;

            dbMonth.query(query, [previousShiftDate, previousShift], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching production data' });
                }

                if (results.length > 0) {
                    let totalRTIME = 0;
                    let totalPSTIME = 0;

                    results.forEach(row => {
                        totalRTIME += Number(row.RTIME) || 0;
                        totalPSTIME += Number(row.PSTIME) || 0;
                    });

                    // Calculate the production efficiency
                    const totalTime = totalRTIME + totalPSTIME;
                    let productionEfficiency = 0;
                    if (totalTime > 0) {
                        productionEfficiency = (totalRTIME / totalTime) * 100;
                    }

                    return res.json({
                        previousShiftProductionEfficiency: parseFloat(productionEfficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No previous shift data found' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No data found in CURPROD table' });
        }
    });
};

const getYesterdayProductionEfficiency = (req, res) => {
    // Fetch the latest entry in the CURPROD table
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            // Extract the SDATE value from the result
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');  // Format the month and year as MMYYYY
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');  // Get yesterday's date

            // Construct the PROD_MMYY table name dynamically
            const prodTableName = `PROD_${monthYear}`;

            // Query the PROD_MMYY table for yesterday's date to sum up RTIME and PSTIME
            dbMonth.query(`
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME
                FROM \`${prodTableName}\`
                WHERE SDATE = ?
            `, [yesterday], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching production data' });
                }

                if (results.length > 0) {
                    // Get the sum of RTIME and PSTIME values
                    const totalRTIME = Number(results[0].totalRTIME) || 0;  // Explicitly convert to number
                    const totalPSTIME = Number(results[0].totalPSTIME) || 0;  // Explicitly convert to number

                    // Calculate the production efficiency
                    const totalTime = totalRTIME + totalPSTIME;
                    let productionEfficiency = 0;

                    if (totalTime > 0) {
                        productionEfficiency = (totalRTIME / totalTime) * 100;
                    }

                    // Return the result with two decimal places in the desired format
                    return res.json({
                        yesterdayProductionEfficiency: parseFloat(productionEfficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for yesterday in PROD_MMYY table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getCurrentMonthProductionEfficiency = (req, res) => {
    // Fetch the latest entry in the CURPROD table to get the current month and year
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching production' });
        }

        if (results.length > 0) {
            // Extract the SDATE value from the result
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');  // Format the month and year as MMYYYY
            const prodTableName = `PROD_${monthYear}`;  // Construct the PROD_MMYY table name dynamically

            // Query the PROD_MMYY table for the current month to sum up RTIME and PSTIME
            dbMonth.query(`
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME
                FROM \`${prodTableName}\`
            `, (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching production data' });
                }

                if (results.length > 0) {
                    // Get the sum of RTIME and PSTIME values
                    const totalRTIME = Number(results[0].totalRTIME) || 0;  // Explicitly convert to number
                    const totalPSTIME = Number(results[0].totalPSTIME) || 0;  // Explicitly convert to number

                    // Calculate the production efficiency
                    const totalTime = totalRTIME + totalPSTIME;
                    let productionEfficiency = 0;

                    if (totalTime > 0) {
                        productionEfficiency = (totalRTIME / totalTime) * 100;
                    }

                    // Return the result with two decimal places in the desired format
                    return res.json({
                        monthProductionEfficiency: parseFloat(productionEfficiency.toFixed(2))
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for the current month in PROD_MMYY table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getOldProductionEfficiencyData = (req, res) => {
    // Step 1: Fetch the latest SDATE and SHIFT
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = results[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Determine previous shift
        let previousShift = shift === 1 ? 2 : 1;

        // Initialize response object
        let response = {
            previousShift: '0%',
            yesterday: '0%',
            currentMonth: '0%'
        };

        // Query 1: Previous shift production efficiency
        const previousShiftQuery = `
            SELECT RTIME, PSTIME
            FROM \`${prodTableName}\`
            WHERE DATE(SDATE) = ? AND SHIFT = ?
        `;
        dbMonth.query(previousShiftQuery, [previousShiftDate, previousShift], (err, prevResults) => {
            if (err) {
                console.error('Error fetching previous shift efficiency:', err.stack);
                return res.status(500).json({ error: 'Database query failed for previous shift' });
            }

            let totalRTIME = 0, totalPSTIME = 0;
            prevResults.forEach(row => {
                totalRTIME += Number(row.RTIME) || 0;
                totalPSTIME += Number(row.PSTIME) || 0;
            });
            const totalTime = totalRTIME + totalPSTIME;
            response.previousShift = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

            // Query 2: Yesterday's production efficiency
            const yesterdayQuery = `
                SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME
                FROM \`${prodTableName}\`
                WHERE SDATE = ?
            `;
            dbMonth.query(yesterdayQuery, [yesterday], (err, yestResults) => {
                if (err) {
                    console.error('Error fetching yesterday efficiency:', err.stack);
                    return res.status(500).json({ error: 'Database query failed for yesterday' });
                }

                const totalRTIME = Number(yestResults[0]?.totalRTIME) || 0;
                const totalPSTIME = Number(yestResults[0]?.totalPSTIME) || 0;
                const totalTime = totalRTIME + totalPSTIME;
                response.yesterday = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

                // Query 3: Current month production efficiency
                const monthQuery = `
                    SELECT SUM(RTIME) AS totalRTIME, SUM(PSTIME) AS totalPSTIME
                    FROM \`${prodTableName}\`
                    WHERE SDATE LIKE ?
                `;
                dbMonth.query(monthQuery, [monthPattern], (err, monthResults) => {
                    if (err) {
                        console.error('Error fetching month efficiency:', err.stack);
                        return res.status(500).json({ error: 'Database query failed for month' });
                    }

                    const totalRTIME = Number(monthResults[0]?.totalRTIME) || 0;
                    const totalPSTIME = Number(monthResults[0]?.totalPSTIME) || 0;
                    const totalTime = totalRTIME + totalPSTIME;
                    response.currentMonth = totalTime > 0 ? `${((totalRTIME / totalTime) * 100).toFixed(2)}%` : '0%';

                    // Send the combined response
                    res.json(response);
                });
            });
        });
    });
};





// MPS
const getCurrentShiftMPS = (req, res) => {
    dbLoom.query(`
        SELECT 
            SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
            SUM(COALESCE(SSTOP, 0)) AS totalSStop
        FROM CURPROD
    `, (err, results) => {
        if (err) {
            console.error('Error fetching SSTIME and SSTOP from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching MPS' });
        }

        if (results.length > 0) {
            const { totalSSTime, totalSStop } = results[0];

            // Check if SSTOP is not zero to avoid division by zero
            if (totalSStop === 0) {
                return res.status(400).json({ error: 'Total stops (SSTOP) is zero, cannot calculate minutes per stop' });
            }

            const minutesPerStop = totalSSTime / totalSStop;
            const hours = Math.floor(minutesPerStop / 60);    
            const minutes = Math.round(minutesPerStop % 60);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            return res.json({
                mps: formattedTime
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getPreviousShiftMPS = (req, res) => {
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT from CURPROD:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const shift = results[0].SHIFT;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            let targetDate, targetShift;

            // Determine the correct date and shift
            if (shift === 1) {
                targetDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
                targetShift = 2;
            } else if (shift === 2) {
                targetDate = moment(sdate).format('YYYY-MM-DD');
                targetShift = 1;
            } else {
                return res.status(400).json({ error: 'Invalid SHIFT value in CURPROD' });
            }

            // Query to calculate MPS for the previous shift
            const query = `
                SELECT 
                    SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
                    SUM(COALESCE(SSTOP, 0)) AS totalSStop
                FROM \`${prodTableName}\`
                WHERE DATE(SDATE) = ? AND SHIFT = ?
            `;

            dbMonth.query(query, [targetDate, targetShift], (err, results) => {
                if (err) {
                    console.error('Error fetching previous shift data:', err.stack);
                    return res.status(500).json({ error: 'Database query failed' });
                }

                if (results.length > 0) {
                    const { totalSSTime, totalSStop } = results[0];

                    if (totalSStop === 0) {
                        return res.status(400).json({ error: 'Total stops (SSTOP) is zero, cannot calculate minutes per stop' });
                    }

                    const minutesPerStop = totalSSTime / totalSStop;
                    const hours = Math.floor(minutesPerStop / 60);
                    const minutes = Math.round(minutesPerStop % 60);
                    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                    return res.json({
                        previousShiftMps: formattedTime
                    });
                } else {
                    return res.status(404).json({ error: 'No data found for previous shift' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }
    });
};

const getYesterdayMPS = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching MPS' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const year = moment(sdate).year();
            const month = moment(sdate).month() + 1;
            const day = moment(sdate).date();
            const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');

            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            dbMonth.query(`
                SELECT 
                    SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
                    SUM(COALESCE(SSTOP, 0)) AS totalSStop
                FROM \`${prodTableName}\`
                WHERE SDATE = ?`, [yesterday], (err, results) => {

                if (err) {
                    console.error('Error fetching data from the PROD_MMYYYY table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching MPS' });
                }

                if (results.length > 0) {
                    const { totalSSTime, totalSStop } = results[0];

                    // Step 4: Check if SSTOP is zero to avoid division by zero
                    if (totalSStop === 0) {
                        return res.status(400).json({ error: 'Total stops (SSTOP) is zero, cannot calculate minutes per stop' });
                    }

                    const minutesPerStop = totalSSTime / totalSStop;
                    const hours = Math.floor(minutesPerStop / 60); 
                    const minutes = Math.round(minutesPerStop % 60);
                    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                    return res.json({
                        yesterdayMps: formattedTime
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for yesterday in the PROD table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getCurrentMonthMPS = (req, res) => {
    dbLoom.query('SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from CURPROD table:', err.stack);
            return res.status(500).json({ error: 'Error fetching MPS' });
        }

        if (results.length > 0) {
            const sdate = results[0].SDATE;
            const monthYear = moment(sdate).format('MMYYYY');
            const prodTableName = `PROD_${monthYear}`;

            dbMonth.query(`
                SELECT 
                    SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
                    SUM(COALESCE(SSTOP, 0)) AS totalSStop
                FROM \`${prodTableName}\`
                WHERE SDATE LIKE ?`, [`${moment(sdate).format('YYYY-MM')}%`], (err, results) => {

                if (err) {
                    console.error('Error fetching data from the PROD_MMYYYY table:', err.stack);
                    return res.status(500).json({ error: 'Error fetching MPS' });
                }

                if (results.length > 0) {
                    const { totalSSTime, totalSStop } = results[0];

                    if (totalSStop === 0) {
                        return res.status(400).json({ error: 'Total stops (SSTOP) is zero, cannot calculate minutes per stop' });
                    }

                    const minutesPerStop = totalSSTime / totalSStop;
                    const hours = Math.floor(minutesPerStop / 60); 
                    const minutes = Math.round(minutesPerStop % 60);
                    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                    return res.json({
                        monthMps: formattedTime
                    });
                } else {
                    return res.status(404).json({ error: 'No entries found for the month in the PROD table.' });
                }
            });
        } else {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }
    });
};

const getOldMPSData = (req, res) => {
    // Step 1: Fetch the latest SDATE and SHIFT
    dbLoom.query('SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching SDATE and SHIFT:', err.stack);
            return res.status(500).json({ error: 'Error fetching SDATE and SHIFT' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No SDATE entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = results[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Determine previous shift
        let previousShift = shift === 1 ? 2 : 1;

        // Initialize response object
        let response = {
            previousShift: '00:00',
            yesterday: '00:00',
            currentMonth: '00:00'
        };

        // Helper function to calculate MPS
        const calculateMPS = (totalSSTime, totalSStop) => {
            if (totalSStop === 0) return '00:00';
            const minutesPerStop = totalSSTime / totalSStop;
            const hours = Math.floor(minutesPerStop / 60);
            const minutes = Math.round(minutesPerStop % 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };

        // Query 1: Previous shift MPS
        const previousShiftQuery = `
            SELECT SUM(COALESCE(SSTIME, 0)) AS totalSSTime, SUM(COALESCE(SSTOP, 0)) AS totalSStop
            FROM \`${prodTableName}\`
            WHERE DATE(SDATE) = ? AND SHIFT = ?
        `;
        dbMonth.query(previousShiftQuery, [previousShiftDate, previousShift], (err, prevResults) => {
            if (err) {
                console.error('Error fetching previous shift MPS:', err.stack);
                return res.status(500).json({ error: 'Database query failed for previous shift MPS' });
            }

            const { totalSSTime = 0, totalSStop = 0 } = prevResults[0] || {};
            response.previousShift = calculateMPS(totalSSTime, totalSStop);

            // Query 2: Yesterday MPS
            const yesterdayQuery = `
                SELECT SUM(COALESCE(SSTIME, 0)) AS totalSSTime, SUM(COALESCE(SSTOP, 0)) AS totalSStop
                FROM \`${prodTableName}\`
                WHERE SDATE = ?
            `;
            dbMonth.query(yesterdayQuery, [yesterday], (err, yestResults) => {
                if (err) {
                    console.error('Error fetching yesterday MPS:', err.stack);
                    return res.status(500).json({ error: 'Database query failed for yesterday MPS' });
                }

                const { totalSSTime = 0, totalSStop = 0 } = yestResults[0] || {};
                response.yesterday = calculateMPS(totalSSTime, totalSStop);

                // Query 3: Current month MPS
                const monthQuery = `
                    SELECT SUM(COALESCE(SSTIME, 0)) AS totalSSTime, SUM(COALESCE(SSTOP, 0)) AS totalSStop
                    FROM \`${prodTableName}\`
                    WHERE SDATE LIKE ?
                `;
                dbMonth.query(monthQuery, [monthPattern], (err, monthResults) => {
                    if (err) {
                        console.error('Error fetching month MPS:', err.stack);
                        return res.status(500).json({ error: 'Database query failed for month MPS' });
                    }

                    const { totalSSTime = 0, totalSStop = 0 } = monthResults[0] || {};
                    response.currentMonth = calculateMPS(totalSSTime, totalSStop);

                    // Send the combined response
                    res.json(response);
                });
            });
        });
    });
};





// STOP LOSS
const getCurrentShiftStopLoss = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];

        // Function to format seconds as HH:MM:SS
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Function to calculate Stop Loss from CURPROD
        const calculateStopLoss = async () => {
            const query = `
                SELECT 
                    SUM(LSTIME) AS totalLSTIME, 
                    SUM(SSTIME) AS totalSSTIME 
                FROM CURPROD 
                WHERE SHIFT = ? AND DATE(SDATE) = ?`;
            const [result] = await dbLoom.promise().query(query, [shift, sdate]);
            const totalLSTIME = Number(result[0]?.totalLSTIME) || 0;
            const totalSSTIME = Number(result[0]?.totalSSTIME) || 0;
            return totalLSTIME + totalSSTIME; // Total stop loss in seconds
        };

        // Get current shift stop loss
        const currentShiftStopLossSeconds = await calculateStopLoss();
        const currentShiftStopLoss = secondsToHHMMSS(currentShiftStopLossSeconds);

        // Return stop loss in the required format
        return res.json({
            stopLoss: currentShiftStopLoss
        });

    } catch (error) {
        console.error('Error in getStopLoss:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current shift stop loss.' });
    }
};

const getYesterdayStopLoss = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const sdate = latestData[0].SDATE;
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;

        // Function to convert seconds to HH:MM:SS
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Function to calculate Stop Loss
        const calculateStopLoss = async (query, params) => {
            const [result] = await dbMonth.promise().query(query, params);
            const totalLSTIME = Number(result[0]?.totalLSTIME) || 0;
            const totalSSTIME = Number(result[0]?.totalSSTIME) || 0;
            return totalLSTIME + totalSSTIME;
        };

        // Query for Yesterday’s Stop Loss
        const yesterdayStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\` 
             WHERE DATE(SDATE) = ?`, 
            [yesterdayDate]
        );

        // Convert to HH:MM:SS format
        const yesterdayStopLoss = secondsToHHMMSS(yesterdayStopLossSeconds);

        // Return Yesterday's Stop Loss
        return res.json({
            yesterdayStopLoss
        });

    } catch (error) {
        console.error('Error in getYesterdayStopLoss:', error);
        return res.status(500).json({ error: 'An error occurred while fetching yesterday’s stop loss.' });
    }
};

const getPreviousShiftStopLoss = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT from CURPROD
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper Function: Convert seconds to HH:MM:SS
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Helper Function: Calculate Stop Loss from Database
        const calculateStopLoss = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalLSTIME = Number(result[0]?.totalLSTIME || 0);
            const totalSSTIME = Number(result[0]?.totalSSTIME || 0);
            return totalLSTIME + totalSSTIME; // Return total seconds
        };

        // Query for Previous Shift Stop Loss
        const previousShiftStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\` 
             WHERE SDATE = ? AND SHIFT = ?`, 
            [previousShiftDate, previousShiftId], 
            dbMonth
        );

        // Convert to HH:MM:SS Format
        const previousShiftStopLoss = secondsToHHMMSS(previousShiftStopLossSeconds);

        // Return the previous shift stop loss
        return res.json({
            previousShiftStopLoss,
        });

    } catch (error) {
        console.error('Error in getPreviousShiftStopLoss:', error);
        return res.status(500).json({ error: 'An error occurred while fetching previous shift stop loss.' });
    }
};

const getCurrentMonthStopLoss = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Function to format seconds as HH:MM:SS
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Function to calculate Stop Loss
        const calculateStopLoss = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalLSTIME = Number(result[0]?.totalLSTIME || 0);
            const totalSSTIME = Number(result[0]?.totalSSTIME || 0);
            return totalLSTIME + totalSSTIME; // Return total seconds
        };

        // Query to calculate current month's stop loss
        const currentMonthStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\` 
             WHERE SDATE LIKE ?`, 
            [`${moment(sdate).format('YYYY-MM')}%`], 
            dbMonth
        );

        // Convert to HH:MM:SS
        const currentMonthStopLoss = secondsToHHMMSS(currentMonthStopLossSeconds);

        // Return result
        return res.json({
            currentMonthStopLoss
        });

    } catch (error) {
        console.error('Error in getCurrentMonthStopLoss:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current month stop loss.' });
    }
};

const getOldStopLossData = async (req, res) => {
    try {
        // Step 1: Get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Determine the previous shift
        const previousShift = shift === 1 ? 2 : 1;

        // Helper function: Convert seconds to HH:MM:SS
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Helper function: Calculate Stop Loss
        const calculateStopLoss = async (query, params) => {
            const [result] = await dbMonth.promise().query(query, params);
            const totalLSTIME = Number(result[0]?.totalLSTIME || 0);
            const totalSSTIME = Number(result[0]?.totalSSTIME || 0);
            return totalLSTIME + totalSSTIME;
        };

        // Step 2: Fetch Previous Shift Stop Loss
        const previousShiftStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\`
             WHERE DATE(SDATE) = ? AND SHIFT = ?`, 
            [previousShiftDate, previousShift]
        );
        const previousShiftStopLoss = secondsToHHMMSS(previousShiftStopLossSeconds);

        // Step 3: Fetch Yesterday Stop Loss
        const yesterdayStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\`
             WHERE DATE(SDATE) = ?`, 
            [yesterday]
        );
        const yesterdayStopLoss = secondsToHHMMSS(yesterdayStopLossSeconds);

        // Step 4: Fetch Current Month Stop Loss
        const monthStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME 
             FROM \`${prodTableName}\`
             WHERE SDATE LIKE ?`, 
            [monthPattern]
        );
        const monthStopLoss = secondsToHHMMSS(monthStopLossSeconds);

        // Step 5: Send the combined response
        res.json({
            previousShift: previousShiftStopLoss,
            yesterday: yesterdayStopLoss,
            currentMonth: monthStopLoss
        });

    } catch (error) {
        console.error('Error in getOldStopLoss:', error);
        res.status(500).json({ error: 'An error occurred while fetching stop loss data.' });
    }
};





// AIR
const getCurrentShiftAir = async (req, res) => { 
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];

        // Function to calculate the average air consumption
        const calculateAverageAir = async (query, params) => {
            const [results] = await dbLoom.promise().query(query, params);
            if (!results.length) return 0;

            const totalCFM = results.reduce((sum, row) => sum + (Number(row.CFM) || 0), 0);
            return parseFloat((totalCFM / results.length).toFixed(2));
        };

        // Query to calculate current shift air
        const currentShiftAir = await calculateAverageAir(
            `SELECT CFM FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`,
            [shift, sdate]
        );

        // Return result in the required format
        return res.json({
            air: currentShiftAir
        });

    } catch (error) {
        console.error('Error in getAir:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current shift air consumption.' });
    }
};

const getYesterdayAir = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate average value from results
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Function to query and compute the average air (CFM)
        const airPowerQuery = async (query, params, field, db) => {
            const [results] = await db.promise().query(query, params);
            return calculateAverage(results, field);
        };

        // Query for yesterday's Air (CFM)
        const yesterdayAir = await airPowerQuery(
            `SELECT CFM FROM \`${prodTableName}\` WHERE SDATE = ?`,
            [yesterdayDate],
            'CFM',
            dbMonth
        );

        // Return result
        return res.json({
            yesterdayAir
        });

    } catch (error) {
        console.error('Error in getYesterdayAir:', error);
        return res.status(500).json({ error: 'An error occurred while fetching yesterday\'s air usage.' });
    }
};

const getPreviousShiftAir = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Function to calculate average air consumption
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Query to get previous shift air (CFM)
        const [results] = await dbMonth.promise().query(
            `SELECT CFM FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`, 
            [previousShiftDate, previousShiftId]
        );

        // Calculate average CFM for previous shift
        const previousShiftAir = calculateAverage(results, 'CFM');

        // Return result
        return res.json({
            previousShiftAir
        });

    } catch (error) {
        console.error('Error in getPreviousShiftAir:', error);
        return res.status(500).json({ error: 'An error occurred while fetching previous shift air consumption.' });
    }
};

const getCurrentMonthAir = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const currentMonthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        // Function to calculate average CFM
        const calculateAverageCFM = async (query, params, db) => {
            const [results] = await db.promise().query(query, params);
            const totalCFM = results.reduce((sum, row) => sum + (Number(row.CFM) || 0), 0);
            return results.length > 0 ? parseFloat((totalCFM / results.length).toFixed(2)) : 0;
        };

        // Query for current month's air consumption
        const currentMonthAir = await calculateAverageCFM(
            `SELECT CFM FROM \`${prodTableName}\` WHERE SDATE LIKE ?`, 
            [currentMonthPattern], 
            dbMonth
        );

        // Return result
        return res.json({
            currentMonthAir
        });

    } catch (error) {
        console.error('Error in getCurrentMonthAir:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current month air consumption.' });
    }
};

const getOldAirData = async (req, res) => {
    try {
        // Step 1: Get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper Function: Calculate Average
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Helper Function: Execute Query and Calculate Average
        const getAverageCFM = async (query, params) => {
            const [results] = await dbMonth.promise().query(query, params);
            return calculateAverage(results, 'CFM');
        };

        // Step 2: Calculate Previous Shift Air
        const previousShift = await getAverageCFM(
            `SELECT CFM FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`,
            [previousShiftDate, previousShiftId]
        );

        // Step 3: Calculate Yesterday Air
        const yesterday = await getAverageCFM(
            `SELECT CFM FROM \`${prodTableName}\` WHERE DATE(SDATE) = ?`,
            [yesterdayDate]
        );

        // Step 4: Calculate Current Month Air
        const currentMonth = await getAverageCFM(
            `SELECT CFM FROM \`${prodTableName}\` WHERE SDATE LIKE ?`,
            [monthPattern]
        );

        // Step 5: Return Combined Response
        res.json({
            previousShift,
            yesterday,
            currentMonth
        });

    } catch (error) {
        console.error('Error in getOldAir:', error);
        res.status(500).json({ error: 'An error occurred while fetching air consumption data.' });
    }
};





// POWER
const getCurrentShiftPower = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];

        // Function to calculate average value from results
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Query for current shift power consumption
        const [powerResults] = await dbLoom.promise().query(
            `SELECT KWH FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`,
            [shift, sdate]
        );

        // Calculate current shift power average
        const currentShiftPower = calculateAverage(powerResults, 'KWH');

        // Return result
        return res.json({
            power: currentShiftPower
        });

    } catch (error) {
        console.error('Error in getPower:', error);
        return res.status(500).json({ error: 'An error occurred while fetching power data.' });
    }
};

const getYesterdayPower = async (req, res) => {
    try {
        // Get the latest SDATE from CURPROD
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        // Determine yesterday's date and the production table name
        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate average from query results
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Query for yesterday's power (KWH)
        const [results] = await dbMonth.promise().query(
            `SELECT KWH FROM \`${prodTableName}\` WHERE SDATE = ?`, 
            [yesterdayDate]
        );

        const yesterdayPower = calculateAverage(results, 'KWH');

        // Return yesterday's power consumption
        return res.json({
            yesterdayPower
        });

    } catch (error) {
        console.error('Error in getYesterdayPower:', error);
        return res.status(500).json({ error: 'An error occurred while fetching yesterday\'s power consumption.' });
    }
};

const getPreviousShiftPower = async (req, res) => {
    try {
        // Get the latest shift date and shift from CURPROD
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Calculate previous shift date and shift
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper function to calculate average from query results
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Function to query average power (KWH)
        const airPowerQuery = async (query, params, field, db) => {
            const [results] = await db.promise().query(query, params);
            return calculateAverage(results, field);
        };

        // Query to get the previous shift's average power
        const previousShiftPower = await airPowerQuery(
            `SELECT KWH FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`, 
            [previousShiftDate, previousShiftId], 
            'KWH', 
            dbMonth
        );

        // Return the result
        return res.json({
            previousShiftPower
        });

    } catch (error) {
        console.error('Error in getPreviousShiftPower:', error);
        return res.status(500).json({ error: 'An error occurred while fetching previous shift power.' });
    }
};

const getCurrentMonthPower = async (req, res) => {
    try {
        // Query to get the latest SDATE from CURPROD
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate average from results
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Function to query average power for current month
        const calculateCurrentMonthPower = async (query, params, db) => {
            const [results] = await db.promise().query(query, params);
            return calculateAverage(results, 'KWH');
        };

        // Query for current month's power
        const currentMonthPower = await calculateCurrentMonthPower(
            `SELECT KWH FROM \`${prodTableName}\` WHERE SDATE LIKE ?`,
            [`${moment(sdate).format('YYYY-MM')}%`],
            dbMonth
        );

        // Return result
        return res.json({
            currentMonthPower
        });

    } catch (error) {
        console.error('Error in getCurrentMonthPower:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current month power.' });
    }
};

const getOldPowerData = async (req, res) => {
    try {
        // Step 1: Get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper Function: Calculate Average
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Helper Function: Execute Query and Calculate Average
        const getAverageKWH = async (query, params) => {
            const [results] = await dbMonth.promise().query(query, params);
            return calculateAverage(results, 'KWH');
        };

        // Step 2: Calculate Previous Shift Power
        const previousShift = await getAverageKWH(
            `SELECT KWH FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`,
            [previousShiftDate, previousShiftId]
        );

        // Step 3: Calculate Yesterday Power
        const yesterday = await getAverageKWH(
            `SELECT KWH FROM \`${prodTableName}\` WHERE DATE(SDATE) = ?`,
            [yesterdayDate]
        );

        // Step 4: Calculate Current Month Power
        const currentMonth = await getAverageKWH(
            `SELECT KWH FROM \`${prodTableName}\` WHERE SDATE LIKE ?`,
            [monthPattern]
        );

        // Step 5: Return Combined Response
        res.json({
            previousShift,
            yesterday,
            currentMonth
        });

    } catch (error) {
        console.error('Error in getOldPower:', error);
        res.status(500).json({ error: 'An error occurred while fetching power consumption data.' });
    }
};





// SPEED
const getCurrentShiftSpeed = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT from CURPROD
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];

        // Function to calculate Speed (PICKS / RTIME)
        const calculateSpeed = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalPicks = Number(result[0]?.totalPicks || 0);
            const totalRunTimeSeconds = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const rpm = (totalPicks / totalRunTimeSeconds) * 60; // Convert to RPM
            return parseFloat(rpm.toFixed(2));
        };

        // Query to calculate current shift speed
        const speedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM CURPROD 
            WHERE SHIFT = ? AND DATE(SDATE) = ?
        `;

        // Get current shift speed (in RPM)
        const currentShiftSpeed = await calculateSpeed(speedQuery, [shift, sdate], dbLoom);

        // Return result
        return res.json({
            speed: currentShiftSpeed
        });

    } catch (error) {
        console.error('Error in getSpeed:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current shift speed.' });
    }
};

const getYesterdaySpeed = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate Speed (RPM = (PICKS / RTIME) * 60)
        const calculateSpeed = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalPicks = Number(result[0]?.totalPicks || 0);
            const totalRunTime = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const speed = (totalPicks / totalRunTime) * 60; // RPM
            return parseFloat(speed.toFixed(2));
        };

        // Query to calculate yesterday's speed
        const yesterdaySpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE SDATE = ?`;

        const yesterdaySpeed = await calculateSpeed(yesterdaySpeedQuery, [yesterdayDate], dbMonth);

        // Return result
        return res.json({
            yesterdaySpeed
        });

    } catch (error) {
        console.error('Error in getYesterdaySpeed:', error);
        return res.status(500).json({ error: 'An error occurred while fetching yesterday\'s speed.' });
    }
};

const getPreviousShiftSpeed = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Function to calculate Speed (PICKS / RTIME)
        const calculateSpeed = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalPicks = Number(result[0]?.totalPicks || 0);
            const totalRunTimeSeconds = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const speedRPM = (totalPicks / totalRunTimeSeconds) * 60; // Picks per minute (RPM)
            return parseFloat(speedRPM.toFixed(2));
        };

        // Query to calculate previous shift speed
        const previousShiftSpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE SHIFT = ? AND DATE(SDATE) = ?
        `;

        // Get the previous shift speed
        const previousShiftSpeed = await calculateSpeed(
            previousShiftSpeedQuery, 
            [previousShiftId, previousShiftDate], 
            dbMonth
        );

        // Return result
        return res.json({
            previousShiftSpeed
        });

    } catch (error) {
        console.error('Error in getPreviousShiftSpeed:', error);
        return res.status(500).json({ error: 'An error occurred while fetching previous shift speed.' });
    }
};

const getCurrentMonthSpeed = async (req, res) => {
    try {
        // Query to get the latest SDATE from CURPROD
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate Speed (PICKS / RTIME)
        const calculateSpeed = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalPicks = Number(result[0]?.totalPicks || 0);
            const totalRunTimeSeconds = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const rpm = (totalPicks / totalRunTimeSeconds) * 60; // Picks per minute (RPM)
            return parseFloat(rpm.toFixed(2));
        };

        // Query to calculate current month's speed
        const currentMonthSpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE SDATE LIKE ?`;

        const currentMonthSpeed = await calculateSpeed(
            currentMonthSpeedQuery, 
            [`${moment(sdate).format('YYYY-MM')}%`], 
            dbMonth
        );

        // Return result
        return res.json({
            currentMonthSpeed
        });

    } catch (error) {
        console.error('Error in getCurrentMonthSpeed:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current month speed.' });
    }
};

const getOldSpeedData = async (req, res) => {
    try {
        // Step 1: Get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper Function: Calculate Speed (RPM = (PICKS / RTIME) * 60)
        const calculateSpeed = async (query, params) => {
            const [result] = await dbMonth.promise().query(query, params);
            const totalPicks = Number(result[0]?.totalPicks || 0);
            const totalRunTime = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const speed = (totalPicks / totalRunTime) * 60; // RPM
            return parseFloat(speed.toFixed(2));
        };

        // Step 2: Calculate Previous Shift Speed
        const previousShiftSpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE DATE(SDATE) = ? AND SHIFT = ?
        `;
        const previousShift = await calculateSpeed(previousShiftSpeedQuery, [previousShiftDate, previousShiftId]);

        // Step 3: Calculate Yesterday Speed
        const yesterdaySpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE DATE(SDATE) = ?
        `;
        const yesterday = await calculateSpeed(yesterdaySpeedQuery, [yesterdayDate]);

        // Step 4: Calculate Current Month Speed
        const currentMonthSpeedQuery = `
            SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE SDATE LIKE ?
        `;
        const currentMonth = await calculateSpeed(currentMonthSpeedQuery, [monthPattern]);

        // Step 5: Return Combined Response
        res.json({
            previousShift,
            yesterday,
            currentMonth
        });

    } catch (error) {
        console.error('Error in getOldSpeed:', error);
        res.status(500).json({ error: 'An error occurred while fetching speed data.' });
    }
};





// BPH
const getCurrentShiftBPH = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];

        // Function to calculate BPH (Beats Per Hour)
        const calculateBPH = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalStops = result[0]?.totalStops || 0;
            const totalRunTimeSeconds = result[0]?.totalRunTime || 1; // Avoid division by zero
            const totalRunTimeHours = totalRunTimeSeconds / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        // Query to calculate current shift BPH
        const bphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`;

        // Calculate current shift BPH
        const currentShiftBph = await calculateBPH(bphQuery, [shift, sdate], dbLoom);

        // Return result in the required format
        return res.json({ bph: currentShiftBph });

    } catch (error) {
        console.error('Error in getCurrentShiftBPH:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current shift BPH.' });
    }
};

const getYesterdayBPH = async (req, res) => {
    try {
        // Query to get the latest SDATE from CURPROD
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate BPH (Beats Per Hour)
        const calculateBPH = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalStops = result[0]?.totalStops || 0;
            const totalRunTimeSeconds = result[0]?.totalRunTime || 1; // Avoid division by zero
            const totalRunTimeHours = totalRunTimeSeconds / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        // Query to calculate yesterday's BPH
        const yesterdayBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE = ?`;
        
        // Calculate yesterday's BPH
        const yesterdayBph = await calculateBPH(yesterdayBphQuery, [yesterdayDate], dbMonth);

        // Return result
        return res.json({ yesterdayBph });

    } catch (error) {
        console.error('Error in getYesterdayBPH:', error);
        return res.status(500).json({ error: 'An error occurred while fetching yesterday\'s BPH data.' });
    }
};

const getPreviousShiftBPH = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Calculate BPH for the previous shift
        const calculateBPH = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalStops = result[0]?.totalStops || 0;
            const totalRunTimeSeconds = result[0]?.totalRunTime || 1; // Avoid division by zero
            const totalRunTimeHours = totalRunTimeSeconds / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        const previousShiftBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SHIFT = ? AND DATE(SDATE) = ?`;

        const previousShiftBph = await calculateBPH(previousShiftBphQuery, [previousShiftId, previousShiftDate], dbMonth);

        return res.json({ previousShiftBph });

    } catch (error) {
        console.error('Error in getPreviousShiftBPH:', error);
        return res.status(500).json({ error: 'An error occurred while fetching previous shift BPH data.' });
    }
};

const getCurrentMonthBPH = async (req, res) => {
    try {
        // Query to get the latest SDATE
        const latestDataQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        // Function to calculate BPH (Beats Per Hour)
        const calculateBPH = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalStops = result[0]?.totalStops || 0;
            const totalRunTimeSeconds = result[0]?.totalRunTime || 1;
            const totalRunTimeHours = totalRunTimeSeconds / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        // Calculate currentMonthBPH
        const currentMonthBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE LIKE ?`;
        const currentMonthBph = await calculateBPH(currentMonthBphQuery, [`${moment(sdate).format('YYYY-MM')}%`], dbMonth);

        // Return only currentMonthBPH
        return res.json({
            currentMonthBph
        });

    } catch (error) {
        console.error('Error in getCurrentMonthBPH:', error);
        return res.status(500).json({ error: 'An error occurred while fetching current month BPH.' });
    }
};

const getOldBPHData = async (req, res) => {
    try {
        // Step 1: Get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `PROD_${monthYear}`;

        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const monthPattern = `${moment(sdate).format('YYYY-MM')}%`;

        const previousShiftId = shift === 1 ? 2 : 1;

        // Helper Function: Calculate BPH (Beats Per Hour)
        const calculateBPH = async (query, params) => {
            const [result] = await dbMonth.promise().query(query, params);
            const totalStops = Number(result[0]?.totalStops || 0);
            const totalRunTime = Number(result[0]?.totalRunTime || 1); // Avoid division by zero
            const totalRunTimeHours = totalRunTime / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        // Step 2: Calculate Previous Shift BPH
        const previousShiftBphQuery = `
            SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE DATE(SDATE) = ? AND SHIFT = ?
        `;
        const previousShift = await calculateBPH(previousShiftBphQuery, [previousShiftDate, previousShiftId]);

        // Step 3: Calculate Yesterday BPH
        const yesterdayBphQuery = `
            SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE DATE(SDATE) = ?
        `;
        const yesterday = await calculateBPH(yesterdayBphQuery, [yesterdayDate]);

        // Step 4: Calculate Current Month BPH
        const currentMonthBphQuery = `
            SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime 
            FROM \`${prodTableName}\` 
            WHERE SDATE LIKE ?
        `;
        const currentMonth = await calculateBPH(currentMonthBphQuery, [monthPattern]);

        // Step 5: Return Combined Response
        res.json({
            previousShift,
            yesterday,
            currentMonth
        });

    } catch (error) {
        console.error('Error in getOldBPH:', error);
        res.status(500).json({ error: 'An error occurred while fetching BPH data.' });
    }
};





// MAP OF PRODUCTION AND MACHINE NAME
const getMachineProductionMap = (req, res) => {
    // SQL query to join CURPROD, MACHINE, and STDSTYLE tables
    const query = `
        SELECT 
            c.MACHINE_ID, 
            c.PICKS, 
            c.STYLE_ID, 
            m.MCNAME, 
            m.PRCON, 
            s.WIDTH, 
            s.PPCM,
            CAST((c.PICKS * s.WIDTH * m.PRCON * 2.54) / (s.PPCM * 100) AS DECIMAL(10, 2)) AS PRODUCTION_METER
        FROM CURPROD c
        JOIN MACHINE m ON c.MACHINE_ID = m.MACHINE_ID
        JOIN STDSTYLE s ON c.STYLE_ID = s.STYLE_ID`;

    dbLoom.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data with JOIN query:', err.stack);
            return res.status(500).json({ error: 'Error fetching production data' });
        }

        // If no results are returned
        if (results.length === 0) {
            return res.status(404).json({ error: 'No matching entries found' });
        }

        // Create a map to store the production data for each machine
        const machineProductionMap = {};

        results.forEach(row => {
            // Calculate K.Picks
            const productionKPicks = row.PICKS / 1000; // Convert PICKS to K.Picks (divide by 1000)
            
            // Extract the production meter value
            const productionMeter = parseFloat(row.PRODUCTION_METER) || 0;

            // Store the values in the map under the machine name
            machineProductionMap[row.MCNAME] = {
                productionKPicks: parseFloat(productionKPicks.toFixed(2)), // Round to 2 decimal places
                productionMeter: parseFloat(productionMeter.toFixed(2)),  // Round to 2 decimal places
            };
        });

        // Return the combined map as the response
        return res.json(machineProductionMap);
    });
};





// MAP OF EFFICIENCY AND MACHINE NAME
const getMachineEfficiencyMap = (req, res) => {
    // SQL query to fetch necessary data from CURPROD and MACHINE tables
    const query = `
        SELECT 
            c.MACHINE_ID, 
            c.RTIME, 
            c.PSTIME, 
            c.NPSTIME, 
            m.MCNAME
        FROM CURPROD c
        JOIN MACHINE m ON c.MACHINE_ID = m.MACHINE_ID
    `;

    dbLoom.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err.stack);
            return res.status(500).json({ error: 'Error fetching efficiency data' });
        }

        // If no results are returned
        if (results.length === 0) {
            return res.status(404).json({ error: 'No matching entries found' });
        }

        // Create a map to store machine efficiencies
        const machineEfficiencyMap = {};

        results.forEach(row => {
            const { RTIME, PSTIME, NPSTIME, MCNAME } = row;
            const totalTime = RTIME + PSTIME + NPSTIME;
            const productionTime = RTIME + PSTIME;

            // Calculate actual efficiency
            let actualEfficiency = 0;
            if (totalTime > 0) {
                actualEfficiency = (RTIME / totalTime) * 100;
            }

            // Calculate production efficiency
            let productionEfficiency = 0;
            if (productionTime > 0) {
                productionEfficiency = (RTIME / productionTime) * 100;
            }

            // Add the efficiencies to the map
            machineEfficiencyMap[MCNAME] = {
                actualEfficiency: parseFloat(actualEfficiency.toFixed(2)), // Round to 2 decimal places
                productionEfficiency: parseFloat(productionEfficiency.toFixed(2)) // Round to 2 decimal places
            };
        });

        // Return the map in the response
        return res.json(machineEfficiencyMap);
    });
};





// MAP OF SPEED AND MACHINE NAME
const getMachineSpeedMap = (req, res) => {
    // SQL query to join CURPROD and MACHINE tables to fetch necessary fields
    const query = `
        SELECT 
            c.MACHINE_ID, 
            c.PICKS, 
            c.RTIME, 
            m.MCNAME, 
            m.PRCON
        FROM CURPROD c
        JOIN MACHINE m ON c.MACHINE_ID = m.MACHINE_ID`;

    dbLoom.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data with JOIN query:', err.stack);
            return res.status(500).json({ error: 'Error fetching machine speed data' });
        }

        // If no results are returned
        if (results.length === 0) {
            return res.status(404).json({ error: 'No matching entries found' });
        }

        // Create a map to store machine name and speed
        const machineSpeedMap = {};

        // Loop through the results to calculate the speed for each machine
        results.forEach(row => {
            const machineName = row.MCNAME;
            const picks = row.PICKS;
            const rtime = row.RTIME;
            const prcon = row.PRCON;

            let currentSpeed = 0; // Default speed
            let averageSpeed = 0; // Default average speed

            // Ensure that we have valid data for calculation
            if (picks && rtime && prcon) {
                // Calculate the speed
                currentSpeed = (picks * 60) / (rtime * prcon);
                averageSpeed = currentSpeed - 1;

                // Add the machine to the map, even if the speed is 0
                machineSpeedMap[machineName] = {
                    currentSpeed: Math.round(currentSpeed), // Round to nearest integer
                    averageSpeed: Math.round(averageSpeed) 
                };
            } else {
                // If no valid data, ensure the machine still appears with speed 0
                machineSpeedMap[machineName] = {
                    currentSpeed: 0,
                    averageSpeed: 0
                };
            }
        });

        // Return the map in the response
        return res.json(machineSpeedMap);
    });
};
















const getStopReportData = async (req, res) => {
    try {
        // Fetch stop data from CURSTOP table, including SCODE, BEGTIME, DURATION, and WSEC_ID
        const stopDataQuery = `SELECT SDATE, MACHINE_ID, SHIFT, SCODE, BEGTIME, DURATION, WSEC_ID FROM CURSTOP`;
        const [stopData] = await dbLoom.promise().query(stopDataQuery);

        if (!stopData.length) {
            return res.status(404).json({ error: 'No data found in CURSTOP table.' });
        }

        // Fetch all machine names, sheds, and stop reason descriptions for quick lookup
        const machineQuery = `SELECT MACHINE_ID, MCNAME, SHED FROM MACHINE`;
        const [machineData] = await dbLoom.promise().query(machineQuery);

        const stopReasonQuery = `SELECT SCODE, DESCR FROM STDSCODE`;
        const [stopReasonData] = await dbLoom.promise().query(stopReasonQuery);

        // Convert machine data into a map for quick lookup
        const machineMap = {};
        machineData.forEach(machine => {
            machineMap[machine.MACHINE_ID] = {
                loom: machine.MCNAME,
                shed: machine.SHED
            };
        });

        // Convert stop reason data into a map for quick lookup
        const stopReasonMap = {};
        stopReasonData.forEach(reason => {
            stopReasonMap[reason.SCODE] = reason.DESCR;
        });

        // Process and format stop data
        const stopReport = stopData.map(entry => {
            // Extract and format the date (YYYY-MM-DD → DD-MM-YYYY)
            const formattedDate = moment(entry.SDATE).format('DD-MM-YYYY');

            // Get the raw BEGTIME (without formatting)
            const time = entry.BEGTIME;

            // Format the duration (convert seconds to HH:MM:SS)
            const durationInSeconds = entry.DURATION || 0;
            const hours = Math.floor(durationInSeconds / 3600);
            const minutes = Math.floor((durationInSeconds % 3600) / 60);
            const seconds = durationInSeconds % 60;
            const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Prefix the WSEC_ID with "WSECTION-" and display as a string
            const weaverSec = `WSECTION-${entry.WSEC_ID}`;

            return {
                "Date": formattedDate,
                "Shift": entry.SHIFT,
                "Loom": machineMap[entry.MACHINE_ID]?.loom || 'Unknown', // Fetch loom from MACHINE table
                "Shed": machineMap[entry.MACHINE_ID]?.shed || 'Unknown', // Fetch shed from MACHINE table
                "Stop Code": entry.SCODE, // Add the stop code from CURSTOP table
                "Stop Reason": stopReasonMap[entry.SCODE] || 'Unknown', // Fetch stop reason from STDSCODE table
                "Time": time, // Display the raw BEGTIME value
                "Duration": formattedDuration, // Add the formatted duration in HH:MM:SS
                "Weaver Sec.": weaverSec // Add the prefixed Weaver Section ID
            };
        });

        return res.json(stopReport);
    } catch (error) {
        console.error('Error fetching stop report data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching stop report data.' });
    }
};

const getStopReportDataFast = async (req, res) => { 
    try {
        // Combined SQL query to fetch data in one go
        const stopDataQuery = `
            SELECT
                CURSTOP.SDATE,
                CURSTOP.MACHINE_ID,
                CURSTOP.SHIFT,
                CURSTOP.SCODE,
                CURSTOP.BEGTIME,
                CURSTOP.DURATION,
                CURSTOP.WSEC_ID,
                MACHINE.MCNAME AS Loom,
                MACHINE.SHED,
                STDSCODE.DESCR AS StopReason
            FROM CURSTOP
            LEFT JOIN MACHINE ON CURSTOP.MACHINE_ID = MACHINE.MACHINE_ID
            LEFT JOIN STDSCODE ON CURSTOP.SCODE = STDSCODE.SCODE
        `;
        
        const [stopData] = await dbLoom.promise().query(stopDataQuery);

        if (!stopData.length) {
            return res.status(404).json({ error: 'No data found in CURSTOP table.' });
        }

        // Process and format stop data
        const stopReport = stopData.map(entry => {
            // Extract and format the date (YYYY-MM-DD → DD-MM-YYYY)
            const formattedDate = moment(entry.SDATE).format('DD-MM-YYYY');

            // Format the duration (convert seconds to HH:MM:SS)
            const durationInSeconds = entry.DURATION || 0;
            const hours = Math.floor(durationInSeconds / 3600);
            const minutes = Math.floor((durationInSeconds % 3600) / 60);
            const seconds = durationInSeconds % 60;
            const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Prefix the WSEC_ID with "WSECTION-" and display as a string
            const weaverSec = `WSECTION-${entry.WSEC_ID}`;

            return {
                "Date": formattedDate,
                "Shift": entry.SHIFT,
                "Loom": entry.Loom || 'Unknown',
                "Shed": entry.SHED || 'Unknown',
                "Stop Code": entry.SCODE,
                "Stop Reason": entry.StopReason || 'Unknown',
                "Time": entry.BEGTIME, // Display the raw BEGTIME value
                "Duration": formattedDuration,
                "Weaver Sec.": weaverSec
            };
        });

        return res.json(stopReport);
    } catch (error) {
        console.error('Error fetching stop report data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching stop report data.' });
    }
};


const getDashboardData = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Function to calculate BPH (Beats Per Hour)
        const calculateBPH = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalStops = result[0].totalStops || 0;
            const totalRunTimeSeconds = result[0].totalRunTime || 1; // Avoid division by zero
            const totalRunTimeHours = totalRunTimeSeconds / 3600;
            return parseFloat((totalStops / totalRunTimeHours).toFixed(2));
        };

        // BPH Queries
        const bphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`;
        const previousShiftBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SHIFT = ? AND DATE(SDATE) = ?`;
        const yesterdayBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE = ?`;
        const currentMonthBphQuery = `SELECT SUM(SSTOP) AS totalStops, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE LIKE ?`;

        // Calculate BPH values
        const currentShiftBph = await calculateBPH(bphQuery, [shift, sdate], dbLoom);
        const previousShiftBph = await calculateBPH(previousShiftBphQuery, [previousShiftId, previousShiftDate], dbMonth);
        const yesterdayBph = await calculateBPH(yesterdayBphQuery, [yesterdayDate], dbMonth);
        const currentMonthBph = await calculateBPH(currentMonthBphQuery, [`${moment(sdate).format('YYYY-MM')}%`], dbMonth);

        // Function to calculate Speed (PICKS / RTIME)
        const calculateSpeed = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalPicks = result[0].totalPicks || 0;
            const totalRunTimeSeconds = result[0].totalRunTime || 1; // Avoid division by zero
            const revolutionsPerSecond = totalPicks / totalRunTimeSeconds;
            return parseFloat((revolutionsPerSecond * 60).toFixed(2)); // Convert to revolutions per minute
        };

        // Speed Queries
        const speedQuery = `SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`;
        const previousShiftSpeedQuery = `SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SHIFT = ? AND DATE(SDATE) = ?`;
        const yesterdaySpeedQuery = `SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE = ?`;
        const currentMonthSpeedQuery = `SELECT SUM(PICKS) AS totalPicks, SUM(RTIME) AS totalRunTime FROM \`${prodTableName}\` WHERE SDATE LIKE ?`;

        // Calculate Speed values (in RPM)
        const currentShiftSpeed = await calculateSpeed(speedQuery, [shift, sdate], dbLoom);
        const previousShiftSpeed = await calculateSpeed(previousShiftSpeedQuery, [previousShiftId, previousShiftDate], dbMonth);
        const yesterdaySpeed = await calculateSpeed(yesterdaySpeedQuery, [yesterdayDate], dbMonth);
        const currentMonthSpeed = await calculateSpeed(currentMonthSpeedQuery, [`${moment(sdate).format('YYYY-MM')}%`], dbMonth);

        // Function to calculate Air & Power Metrics
        const calculateAverage = (results, field) => {
            const total = results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            return results.length > 0 ? parseFloat((total / results.length).toFixed(2)) : 0;
        };

        // Queries for Air & Power
        const airPowerQuery = async (query, params, field, db) => {
            const [results] = await db.promise().query(query, params);
            return calculateAverage(results, field);
        };

        const currentShiftAir = await airPowerQuery(`SELECT CFM FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`, [shift, sdate], 'CFM', dbLoom);
        const previousShiftAir = await airPowerQuery(`SELECT CFM FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`, [previousShiftDate, previousShiftId], 'CFM', dbMonth);
        const yesterdayAir = await airPowerQuery(`SELECT CFM FROM \`${prodTableName}\` WHERE SDATE = ?`, [yesterdayDate], 'CFM', dbMonth);
        const currentMonthAir = await airPowerQuery(`SELECT CFM FROM \`${prodTableName}\` WHERE SDATE LIKE ?`, [`${moment(sdate).format('YYYY-MM')}%`], 'CFM', dbMonth);

        const currentShiftPower = await airPowerQuery(`SELECT KWH FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`, [shift, sdate], 'KWH', dbLoom);
        const previousShiftPower = await airPowerQuery(`SELECT KWH FROM \`${prodTableName}\` WHERE DATE(SDATE) = ? AND SHIFT = ?`, [previousShiftDate, previousShiftId], 'KWH', dbMonth);
        const yesterdayPower = await airPowerQuery(`SELECT KWH FROM \`${prodTableName}\` WHERE SDATE = ?`, [yesterdayDate], 'KWH', dbMonth);
        const currentMonthPower = await airPowerQuery(`SELECT KWH FROM \`${prodTableName}\` WHERE SDATE LIKE ?`, [`${moment(sdate).format('YYYY-MM')}%`], 'KWH', dbMonth);

        // Return all metrics in the required format
        return res.json({
            currentShiftAir,
            previousShiftAir,
            yesterdayAir,
            currentMonthAir,
            currentShiftPower,
            previousShiftPower,
            yesterdayPower,
            currentMonthPower,
            currentShiftBph,
            previousShiftBph,
            yesterdayBph,
            currentMonthBph,
            currentShiftSpeed,
            previousShiftSpeed,
            yesterdaySpeed,
            currentMonthSpeed,
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'An error occurred while fetching dashboard data.' });
    }
};

const fetchAirPerMeter = async (req, res) => {
  try {
    // Query to get the latest SDATE and SHIFT from CURPROD
    const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
    const [latestData] = await dbLoom.promise().query(latestDataQuery);

    if (!latestData.length) {
      return res.status(404).json({ error: 'No entries found in CURPROD table.' });
    }

    const { SDATE: sdate, SHIFT: shift } = latestData[0];
    const monthYear = moment(sdate).format('MMYYYY');
    const prodTableName = `PROD_${monthYear}`;
    const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
    const previousShiftId = shift === 1 ? 2 : 1;
    const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');

    // Optimized function to calculate Air per Meter
    const calculateAirPerMeter = async (query, params, db) => {
      try {
        // Fetch all necessary data in a single query using JOIN to combine CURPROD/PROD_MMYY and STDSTYLE
        const [results] = await db.promise().query(query, params);
        
        // Log the fetched results to inspect the data
        console.log('Fetched Results:', results);

        let totalMeters = 0;
        let totalCFM = 0;

        // Iterate over the results to calculate the total meters and total CFM
        for (const row of results) {
          const { PICKS, STYLE_ID, CFM, PPCM, WIDTH } = row;

          // Skip rows where PICKS is 0
          if (PICKS === 0 || !PICKS || !STYLE_ID || !PPCM || !WIDTH) {
            continue;
          }

          // Calculate the total meters for this entry (convert to meters)
          const meters = (PICKS / PPCM) * WIDTH / 100; // Convert to meters
          totalMeters += meters;
          totalCFM += parseFloat(CFM); // Convert CFM to a number for summation
        }

        // Calculate Air per meter (sum of CFM / sum of meters)
        return totalMeters > 0 ? totalCFM / totalMeters : 0;
      } catch (error) {
        throw new Error('Error calculating Air per Meter');
      }
    };

    // Optimized queries using JOIN to fetch the necessary data in a single query
    const airQuery = `
      SELECT CURPROD.PICKS, CURPROD.STYLE_ID, CURPROD.CFM, STDSTYLE.PPCM, STDSTYLE.WIDTH
      FROM CURPROD
      JOIN BASE_LOOM.STDSTYLE ON CURPROD.STYLE_ID = STDSTYLE.STYLE_ID
      WHERE CURPROD.SHIFT = ? AND DATE(CURPROD.SDATE) = ?
    `;
    const previousShiftAirQuery = `
      SELECT PROD_MMYY.PICKS, PROD_MMYY.STYLE_ID, PROD_MMYY.CFM, STDSTYLE.PPCM, STDSTYLE.WIDTH
      FROM \`${prodTableName}\` PROD_MMYY
      JOIN BASE_LOOM.STDSTYLE ON PROD_MMYY.STYLE_ID = STDSTYLE.STYLE_ID
      WHERE PROD_MMYY.SHIFT = ? AND DATE(PROD_MMYY.SDATE) = ?
    `;
    const yesterdayAirQuery = `
      SELECT PROD_MMYY.PICKS, PROD_MMYY.STYLE_ID, PROD_MMYY.CFM, STDSTYLE.PPCM, STDSTYLE.WIDTH
      FROM \`${prodTableName}\` PROD_MMYY
      JOIN BASE_LOOM.STDSTYLE ON PROD_MMYY.STYLE_ID = STDSTYLE.STYLE_ID
      WHERE PROD_MMYY.SDATE = ?
    `;
    const currentMonthAirQuery = `
      SELECT PROD_MMYY.PICKS, PROD_MMYY.STYLE_ID, PROD_MMYY.CFM, STDSTYLE.PPCM, STDSTYLE.WIDTH
      FROM \`${prodTableName}\` PROD_MMYY
      JOIN BASE_LOOM.STDSTYLE ON PROD_MMYY.STYLE_ID = STDSTYLE.STYLE_ID
      WHERE PROD_MMYY.SDATE LIKE ?
    `;

    // Calculate Air per Meter for different periods
    const currentShiftAir = await calculateAirPerMeter(airQuery, [shift, sdate], dbLoom);
    const previousShiftAir = await calculateAirPerMeter(previousShiftAirQuery, [previousShiftId, previousShiftDate], dbMonth);
    const yesterdayAir = await calculateAirPerMeter(yesterdayAirQuery, [yesterdayDate], dbMonth);
    const currentMonthAir = await calculateAirPerMeter(currentMonthAirQuery, [`${moment(sdate).format('YYYY-MM')}%`], dbMonth);

    // Return the Air per Meter data for each period
    return res.json({
      currentShiftAir: currentShiftAir,
      previousShiftAir: previousShiftAir,
      yesterdayAir: yesterdayAir,
      currentMonthAir: currentMonthAir,
    });
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while fetching Air per Meter data.' });
  }
};

const getMPSData = async (req, res) => {
  try {
    // Function to calculate minutes per stop for any given query
    const calculateMPS = async (query, params, db) => {
      return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
          if (err) {
            return reject(err);
          }

          if (results.length > 0) {
            const { totalSSTime, totalSStop } = results[0];

            if (totalSStop === 0) {
              return reject(new Error('Total stops (SSTOP) is zero, cannot calculate minutes per stop'));
            }

            const minutesPerStop = totalSSTime / totalSStop;
            const hours = Math.floor(minutesPerStop / 60);
            const minutes = Math.round(minutesPerStop % 60);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            resolve(formattedTime);
          } else {
            reject(new Error('No entries found for the given period.'));
          }
        });
      });
    };

    // Query to get current shift MPS
    const getCurrentShiftMPS = async () => {
      const query = `
        SELECT 
          SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
          SUM(COALESCE(SSTOP, 0)) AS totalSStop
        FROM CURPROD
      `;
      return await calculateMPS(query, [], dbLoom);
    };

    // Query to get yesterday's MPS
    const getYesterdayMPS = async () => {
      const latestDateQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
      const [latestDateResults] = await dbLoom.promise().query(latestDateQuery);
      
      if (!latestDateResults.length) {
        throw new Error('No entries found in CURPROD table.');
      }

      const sdate = latestDateResults[0].SDATE;
      const yesterday = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
      const monthYear = moment(sdate).format('MMYYYY');
      const prodTableName = `PROD_${monthYear}`;

      const query = `
        SELECT 
          SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
          SUM(COALESCE(SSTOP, 0)) AS totalSStop
        FROM \`${prodTableName}\`
        WHERE SDATE = ?
      `;
      return await calculateMPS(query, [yesterday], dbMonth);
    };

    // Query to get previous shift MPS
    const getPreviousShiftMPS = async () => {
      const latestShiftQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
      const [shiftData] = await dbLoom.promise().query(latestShiftQuery);

      if (!shiftData.length) {
        throw new Error('No entries found in CURPROD table.');
      }

      const { SDATE: sdate, SHIFT: shift } = shiftData[0];
      const monthYear = moment(sdate).format('MMYYYY');
      const prodTableName = `PROD_${monthYear}`;

      const targetDate = shift === 1 ? moment(sdate).subtract(1, 'day').format('YYYY-MM-DD') : moment(sdate).format('YYYY-MM-DD');
      const targetShift = shift === 1 ? 2 : 1;

      const query = `
        SELECT 
          SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
          SUM(COALESCE(SSTOP, 0)) AS totalSStop
        FROM \`${prodTableName}\`
        WHERE DATE(SDATE) = ? AND SHIFT = ?
      `;
      return await calculateMPS(query, [targetDate, targetShift], dbMonth);
    };

    // Query to get current month's MPS
    const getCurrentMonthMPS = async () => {
      const latestDateQuery = 'SELECT SDATE FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
      const [latestDateResults] = await dbLoom.promise().query(latestDateQuery);
      
      if (!latestDateResults.length) {
        throw new Error('No entries found in CURPROD table.');
      }

      const sdate = latestDateResults[0].SDATE;
      const monthYear = moment(sdate).format('MMYYYY');
      const prodTableName = `PROD_${monthYear}`;

      const query = `
        SELECT 
          SUM(COALESCE(SSTIME, 0)) AS totalSSTime, 
          SUM(COALESCE(SSTOP, 0)) AS totalSStop
        FROM \`${prodTableName}\`
        WHERE SDATE LIKE ?
      `;
      return await calculateMPS(query, [`${moment(sdate).format('YYYY-MM')}%`], dbMonth);
    };

    // Fetch all MPS data concurrently
    const [currentShiftMPS, previousShiftMPS, yesterdayMPS, currentMonthMPS] = await Promise.all([
      getCurrentShiftMPS(),
      getPreviousShiftMPS(),
      getYesterdayMPS(),
      getCurrentMonthMPS()
    ]);

    // Return all the results
    return res.json({
      currentShiftMPS,
      previousShiftMPS,
      yesterdayMPS,
      currentMonthMPS
    });

  } catch (error) {
    console.error('Error in fetchMPSData:', error);
    return res.status(500).json({ error: 'An error occurred while fetching MPS data.' });
  }
};

const getDashboardDataNew = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT from BASE_LOOM.CURPROD
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM BASE_LOOM.CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const prodTableName = `BASE_L_MONTH.PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Function to calculate values (generic)
        const calculateValue = async (query, params, db) => {
            return new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(results.length > 0 ? results[0].value : null);
                });
            });
        };

        // Function to calculate MPS
        const calculateMPS = async (query, params, db) => {
            return new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    if (results.length > 0) {
                        const { totalSSTime, totalSStop } = results[0];
                        if (totalSStop === 0) return resolve('00:00');

                        const minutesPerStop = totalSSTime / totalSStop;
                        const hours = Math.floor(minutesPerStop / 60);
                        const minutes = Math.round(minutesPerStop % 60);
                        return resolve(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                    }
                    return resolve('00:00');
                });
            });
        };

        // Define queries for all metrics
        const metricQueries = {
            MPS: `SELECT SUM(COALESCE(SSTIME, 0)) AS totalSSTime, SUM(COALESCE(SSTOP, 0)) AS totalSStop FROM`,
            Air: `SELECT AVG(AIR) AS value FROM`,
            Power: `SELECT AVG(POWER) AS value FROM`,
            Bph: `SELECT AVG(BPH) AS value FROM`,
            Speed: `SELECT AVG(SPEED) AS value FROM`,
            StopLoss: `SELECT SUM(STOPLOSS) AS value FROM`
        };

        // Helper function for different time periods
        const getMetricForPeriod = async (metric, table, dateCondition, shiftCondition = '', db) => {
            const query = `${metricQueries[metric]} ${table} WHERE ${dateCondition} ${shiftCondition}`;
            return metric === 'MPS' ? await calculateMPS(query, [], db) : await calculateValue(query, [], db);
        };

        // Fetch all values concurrently, ensuring the correct database is used
        const [
            currentShiftMPS, previousShiftMPS, yesterdayMPS, currentMonthMPS,
            currentShiftAir, previousShiftAir, yesterdayAir, currentMonthAir,
            currentShiftPower, previousShiftPower, yesterdayPower, currentMonthPower,
            currentShiftBph, previousShiftBph, yesterdayBph, currentMonthBph,
            currentShiftSpeed, previousShiftSpeed, yesterdaySpeed, currentMonthSpeed,
            currentShiftStopLoss, previousShiftStopLoss, yesterdayStopLoss, currentMonthStopLoss
        ] = await Promise.all([
            getMetricForPeriod('MPS', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('MPS', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('MPS', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('MPS', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth),
            
            getMetricForPeriod('Air', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('Air', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('Air', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('Air', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth),

            getMetricForPeriod('Power', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('Power', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('Power', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('Power', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth),

            getMetricForPeriod('Bph', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('Bph', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('Bph', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('Bph', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth),

            getMetricForPeriod('Speed', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('Speed', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('Speed', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('Speed', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth),

            getMetricForPeriod('StopLoss', 'BASE_LOOM.CURPROD', '1=1', '', dbLoom),
            getMetricForPeriod('StopLoss', `\`${prodTableName}\``, `DATE(SDATE) = '${previousShiftDate}'`, `AND SHIFT = ${previousShiftId}`, dbMonth),
            getMetricForPeriod('StopLoss', `\`${prodTableName}\``, `SDATE = '${previousShiftDate}'`, '', dbMonth),
            getMetricForPeriod('StopLoss', `\`${prodTableName}\``, `SDATE LIKE '${moment(sdate).format('YYYY-MM')}%'`, '', dbMonth)
        ]);

        return res.json({
            currentShiftMPS, previousShiftMPS, yesterdayMPS, currentMonthMPS,
            currentShiftAir, previousShiftAir, yesterdayAir, currentMonthAir,
            currentShiftPower, previousShiftPower, yesterdayPower, currentMonthPower,
            currentShiftBph, previousShiftBph, yesterdayBph, currentMonthBph,
            currentShiftSpeed, previousShiftSpeed, yesterdaySpeed, currentMonthSpeed,
            currentShiftStopLoss, previousShiftStopLoss, yesterdayStopLoss, currentMonthStopLoss
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'An error occurred while fetching dashboard data.' });
    }
};

const getStopLossData = async (req, res) => {
    try {
        // Query to get the latest SDATE and SHIFT
        const latestDataQuery = 'SELECT SDATE, SHIFT FROM CURPROD ORDER BY SDATE DESC LIMIT 1';
        const [latestData] = await dbLoom.promise().query(latestDataQuery);

        if (!latestData.length) {
            return res.status(404).json({ error: 'No entries found in CURPROD table.' });
        }

        const { SDATE: sdate, SHIFT: shift } = latestData[0];
        const monthYear = moment(sdate).format('MMYYYY');
        const yesterdayDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const prodTableName = `PROD_${monthYear}`;
        const previousShiftDate = moment(sdate).subtract(1, 'day').format('YYYY-MM-DD');
        const previousShiftId = shift === 1 ? 2 : 1;

        // Function to format seconds as HH:MM:SS (without quotes)
        const secondsToHHMMSS = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Function to calculate Stop Loss
        const calculateStopLoss = async (query, params, db) => {
            const [result] = await db.promise().query(query, params);
            const totalLSTIME = Number(result[0].totalLSTIME) || 0;
            const totalSSTIME = Number(result[0].totalSSTIME) || 0;
            return totalLSTIME + totalSSTIME; // Return total seconds for further conversion
        };

        // Stop Loss Queries
        const currentShiftStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME FROM CURPROD WHERE SHIFT = ? AND DATE(SDATE) = ?`, 
            [shift, sdate], 
            dbLoom
        );

        const yesterdayStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME FROM \`${prodTableName}\` WHERE SDATE = ?`, 
            [yesterdayDate], 
            dbMonth
        );

        const previousShiftStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME FROM \`${prodTableName}\` WHERE SDATE = ? AND SHIFT = ?`, 
            [previousShiftDate, previousShiftId], 
            dbMonth
        );

        const currentMonthStopLossSeconds = await calculateStopLoss(
            `SELECT SUM(LSTIME) AS totalLSTIME, SUM(SSTIME) AS totalSSTIME FROM \`${prodTableName}\` WHERE SDATE LIKE ?`, 
            [`${moment(sdate).format('YYYY-MM')}%`], 
            dbMonth
        );

        // Convert total seconds to HH:MM:SS format
        const currentShiftStopLoss = secondsToHHMMSS(currentShiftStopLossSeconds);
        const yesterdayStopLoss = secondsToHHMMSS(yesterdayStopLossSeconds);
        const previousShiftStopLoss = secondsToHHMMSS(previousShiftStopLossSeconds);
        const currentMonthStopLoss = secondsToHHMMSS(currentMonthStopLossSeconds);

        
        // Return all metrics in the required format
        return res.json({
            currentShiftStopLoss,
            previousShiftStopLoss,
            yesterdayStopLoss,
            currentMonthStopLoss,
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'An error occurred while fetching dashboard data.' });
    }
};




const stopLossToHHMMSS = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getCurrentShiftData = async (req, res) => {
    try {
        // Single optimized query
        const query = `
            SELECT
                SUM(CURPROD.PICKS) AS totalPicks,
                SUM(CURPROD.PICKS * STDSTYLE.WIDTH * MACHINE.PRCON * 2.54 / (STDSTYLE.PPCM * 100)) AS totalMeter,
                SUM(CURPROD.RTIME) AS totalRTIME,
                SUM(CURPROD.PSTIME) AS totalPSTIME,
                SUM(CURPROD.NPSTIME) AS totalNPSTIME,
                SUM(CURPROD.SSTIME) AS totalSSTIME,
                SUM(CURPROD.SSTOP) AS totalSStop,
                SUM(CURPROD.LSTIME) AS totalLSTIME,
                AVG(CURPROD.CFM) AS avgCFM,
                AVG(CURPROD.KWH) AS avgKWH
            FROM CURPROD
            JOIN MACHINE ON CURPROD.MACHINE_ID = MACHINE.MACHINE_ID
            JOIN STDSTYLE ON CURPROD.STYLE_ID = STDSTYLE.STYLE_ID
        `;

        const [result] = await dbLoom.promise().query(query);
        const data = result[0];

        // Convert to numbers safely
        const totalPicks = Number(data?.totalPicks) || 0;
        const productionKPicks = parseFloat((totalPicks / 1000).toFixed(2));

        const totalMeter = Number(data?.totalMeter) || 0;
        const productionMeter = parseFloat(totalMeter.toFixed(2));

        const totalRTIME = Number(data?.totalRTIME) || 0;
        const totalPSTIME = Number(data?.totalPSTIME) || 0;
        const totalNPSTIME = Number(data?.totalNPSTIME) || 0;

        const totalTime = totalRTIME + totalPSTIME + totalNPSTIME;
        const actualEfficiency = totalTime > 0 
            ? parseFloat(((totalRTIME / totalTime) * 100).toFixed(2)) 
            : 0.00;

        const productionEfficiency = (totalRTIME + totalPSTIME) > 0
            ? parseFloat(((totalRTIME / (totalRTIME + totalPSTIME)) * 100).toFixed(2))
            : 0.00;

        const totalSSTime = Number(data?.totalSSTIME) || 0;
        const totalSStop = Number(data?.totalSStop) || 0;
        const MPS = totalSStop > 0
            ? `${Math.floor(totalSSTime / totalSStop / 60)}:${(Math.floor(totalSSTime / totalSStop) % 60).toString().padStart(2, '0')}`
            : '00:00';

        const totalLSTIME = Number(data?.totalLSTIME) || 0;
        const StopLoss = stopLossToHHMMSS(totalLSTIME + totalSSTime);

        const BPH = totalRTIME > 0 
            ? parseFloat((totalSStop / (totalRTIME / 3600)).toFixed(2)) 
            : 0.00;

        const Speed = totalRTIME > 0
            ? parseFloat(((totalPicks / totalRTIME) * 60).toFixed(2))
            : 0.00;

        const Air = parseFloat((Number(data?.avgCFM) || 0).toFixed(2));
        const Power = parseFloat((Number(data?.avgKWH) || 0).toFixed(2));

        // ✅ Return response
        res.json({
            productionKPicks,
            productionMeter,
            actualEfficiency,
            productionEfficiency,
            MPS,
            StopLoss,
            BPH,
            Speed,
            Air,
            Power
        });

    } catch (error) {
        console.error('Error in getCurrentShiftData:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};












// API Endpoints
app.get('/prod-kpicks', getCurrentShiftProdKPicks);
app.get('/yesterdayprod-kpicks', getYesterdayProdKPicks);
app.get('/previous-shift-prod-kpicks', getPreviousShiftProdKPicks);
app.get('/monthprod-kpicks', getCurrentMonthProdKPicks);

app.get('/prod-meter', getCurrentShiftProdMeter);
app.get('/yesterdayprod-meter', getYesterdayProdMeter);
app.get('/previous-shift-prod-meter', getPreviousShiftProdMeter);
app.get('/monthprod-meter', getCurrentMonthProdMeter);

app.get('/actual-efficiency', getCurrentShiftActualEfficiency);
app.get('/yesterday-actual-efficiency', getYesterdayActualEfficiency);
app.get('/previous-shift-actual-efficiency', getPreviousShiftActualEfficiency);
app.get('/month-actual-efficiency', getCurrentMonthActualEfficiency);

app.get('/production-efficiency', getCurrentShiftProductionEfficiency);
app.get('/yesterday-production-efficiency', getYesterdayProductionEfficiency);
app.get('/previous-shift-production-efficiency', getPreviousShiftProductionEfficiency);
app.get('/month-production-efficiency', getCurrentMonthProductionEfficiency);

app.get('/mps', getCurrentShiftMPS);
app.get('/yesterdayprod-mps', getYesterdayMPS);
app.get('/previous-shift-mps', getPreviousShiftMPS);
app.get('/month-mps', getCurrentMonthMPS);

app.get('/stop-loss', getCurrentShiftStopLoss);
app.get('/yesterday-stop-loss', getYesterdayStopLoss);
app.get('/previous-shift-stop-loss', getPreviousShiftStopLoss);
app.get('/month-stop-loss', getCurrentMonthStopLoss);

app.get('/air', getCurrentShiftAir);
app.get('/yesterday-air', getYesterdayAir);
app.get('/previous-shift-air', getPreviousShiftAir);
app.get('/month-air', getCurrentMonthAir);

app.get('/power', getCurrentShiftPower);
app.get('/yesterday-power', getYesterdayPower);
app.get('/previous-shift-power', getPreviousShiftPower);
app.get('/month-power', getCurrentMonthPower);

app.get('/speed', getCurrentShiftSpeed);
app.get('/yesterday-speed', getYesterdaySpeed);
app.get('/previous-shift-speed', getPreviousShiftSpeed);
app.get('/month-speed', getCurrentMonthSpeed);

app.get('/bph', getCurrentShiftBPH);
app.get('/yesterday-bph', getYesterdayBPH);
app.get('/previous-shift-bph', getPreviousShiftBPH);
app.get('/month-bph', getCurrentMonthBPH);



app.get('/current-shift-data', getCurrentShiftData);
app.get('/old-prod-kpicks-data', getOldProdKPicksData);
app.get('/old-prod-meter-data', getOldProdMeterData);
app.get('/old-actual-efficiency-data', getOldActualEfficiencyData);
app.get('/old-production-efficiency-data', getOldProductionEfficiencyData);
app.get('/old-mps-data', getOldMPSData);
app.get('/old-stop-loss-data', getOldStopLossData);
app.get('/old-air-data', getOldAirData);
app.get('/old-power-data', getOldPowerData);
app.get('/old-speed-data', getOldSpeedData);
app.get('/old-bph-data', getOldBPHData);



app.get('/machine-speed', getMachineSpeedMap);
app.get('/machine-efficiency', getMachineEfficiencyMap);
app.get('/machine-production', getMachineProductionMap);



app.get('/stop-report', getStopReportData);
app.get('/stop-report-fast', getStopReportDataFast);

//app.get('/previous-shift-stop-report', getPreviousShiftStopReportData);




app.get('/dashboard-data', getDashboardData);
app.get('/stop-loss-data', getStopLossData);
app.get('/mps-data', getMPSData);
app.get('/air-mtr', fetchAirPerMeter);
app.get('/dashboard-datan', getDashboardDataNew);





// Start the Express server
//app.listen(port, () => {
//    console.log(`Server is running on http://localhost:${port}`);
//});

// Handle root request
app.get('/', (req, res) => {
    res.send('Backend server is up and running!');
});


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


