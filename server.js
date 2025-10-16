const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: 'postgres',
  password: 'Psql123!',
  host: 'cozystay.postgres.database.azure.com',      
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false       
  }
});

async function checkRoomAvailability(roomType, qty, checkin, checkout) {
  const res = await pool.query(
    `SELECT room_no FROM rooms WHERE room_type = $1
     AND room_no NOT IN (
       SELECT room_no FROM bookings
       WHERE NOT ($3 <= check_in_date OR $2 >= check_out_date)
     )
     LIMIT $4`,
    [roomType, checkin, checkout, qty]
  );

  return res.rows.length >= qty;
}

app.post('/book-room', async (req, res) => {
  try {
    const {
      name,
      phone,
      checkin,
      checkout,
      deluxeRooms = 0,
      suiteRooms = 0,
      standardRooms = 0,
    } = req.body;

    if (!name || !phone || !checkin || !checkout) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = new Date();
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (checkinDate >= checkoutDate) {
      return res.status(400).json({ error: 'Check-in date must be before check-out date' });
    }
    if (checkinDate < now || checkoutDate < now) {
      return res.status(400).json({ error: 'Booking dates cannot be in the past' });
    }

    if (parseInt(deluxeRooms) > 0) {
      const available = await checkRoomAvailability('deluxe', parseInt(deluxeRooms), checkin, checkout);
      if (!available) {
        return res.status(400).json({ error: 'Not enough Deluxe rooms available for the selected dates.' });
      }
    }

    if (parseInt(suiteRooms) > 0) {
      const available = await checkRoomAvailability('executive', parseInt(suiteRooms), checkin, checkout);
      if (!available) {
        return res.status(400).json({ error: 'Not enough Executive suites available for the selected dates.' });
      }
    }

    if (parseInt(standardRooms) > 0) {
      const available = await checkRoomAvailability('standard', parseInt(standardRooms), checkin, checkout);
      if (!available) {
        return res.status(400).json({ error: 'Not enough Standard rooms available for the selected dates.' });
      }
    }

    const customerRes = await pool.query(
      'INSERT INTO customers (full_name, phone_number) VALUES ($1, $2) RETURNING customer_id',
      [name, phone]
    );
    const customerId = customerRes.rows[0].customer_id;

    async function insertBooking(roomType, qty) {
      if (qty <= 0) return;

      const roomsRes = await pool.query(
        `SELECT room_no FROM rooms WHERE room_type = $1
         AND room_no NOT IN (
           SELECT room_no FROM bookings
           WHERE NOT ($3 <= check_in_date OR $2 >= check_out_date)
         )
         LIMIT $4`,
        [roomType, checkin, checkout, qty]
      );

      for (const room of roomsRes.rows) {
        await pool.query(
          'INSERT INTO bookings (customer_id, room_no, check_in_date, check_out_date) VALUES ($1, $2, $3, $4)',
          [customerId, room.room_no, checkin, checkout]
        );
      }
    }

    await insertBooking('deluxe', parseInt(deluxeRooms));
    await insertBooking('executive', parseInt(suiteRooms));
    await insertBooking('standard', parseInt(standardRooms));

    return res.json({ message: 'Booking successful' });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/admin/bookings', async (req, res) => {
  try {
    const bookingsRes = await pool.query(`
      SELECT b.booking_id, c.full_name, c.phone_number, r.room_no, r.room_type, b.check_in_date, b.check_out_date
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN rooms r ON b.room_no = r.room_no
      ORDER BY b.check_in_date DESC
    `);
    res.json(bookingsRes.rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const query = 'SELECT * FROM admin WHERE username = $1 AND password = $2';
    const result = await pool.query(query, [username, password]);

    if (result.rows.length > 0) {
      req.session.user = username; 
      return res.json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});