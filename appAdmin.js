// ================================================== SERVER CONFIG ==================================================
var express = require('express'); 
var app = express();

app.use('/images', express.static('images'));
// this is important for you to display the images. See the client site code in product list. See how the code
// to pull the images

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var upload = require('express-fileupload');
app.use(upload());

var cors = require('cors');
app.use(cors());

const crypto = require('crypto');
const secret = 'abcdefg';

const mysql = require('mysql');
const db = mysql.createConnection({ 
  host : 'localhost', 
  port: '3306',
  user : 'root', 
  password : 'root',
  database : 'ecommerce',
  multipleStatements: true
});
db.connect();

// ================================================== ADMIN SECTION ==================================================

app.get('/', (req, res) => 
{
  res.send('Halaman Server')
})
// Starting point

app.post('/admlogin', (req, res) => 
{
  var Username = req.body.username;
  var Password = req.body.password;
  
  // console.log(Username);
  // console.log(Password);
  
  const encpass = crypto.createHash('sha256', secret).update(Password).digest('hex');
  // console.log(encpass);

  var pullData = "SELECT * FROM admin";
  db.query(pullData, (err, result) => {
    if (err) throw err;
    else
    {
      for (var i=0; i<result.length; i++)
      {
        if (Username === result[i].username && encpass === result[i].password)
        {
          // console.log('Login Berhasil');
          // console.log(result[i].id)
          var userID = result[i].id;
          res.send((userID).toString());
          break;
        }
        else if (i === result.length-1)
        {
          res.send('-1');
        }
      }
    }
  })
})
// Admin Login
// NOTE: Admin login setup is done

// ========================= ADMIN - Home =========================

app.get('/numberofSales', (req, res) =>
{  
  var pullData = 'SELECT COUNT(*) AS transactionCount FROM inv_header'
  db.query(pullData, (err, result) => 
  { 
    if(err) throw err
    else res.send(result);
  });
})
// number of sales for Admin page

app.get('/numberofOrder', (req, res) =>
{  
  var pullData = 'SELECT COUNT(DISTINCT orderID) AS number_order FROM checkout WHERE itemstatus_id="1"'
  db.query(pullData, (err, result) => 
  { 
    if(err) throw err
    else res.send(result);
  });
})
// number of order for Admin page

app.get('/numberofUsers', (req, res) =>
{  
  var pullData = 'SELECT COUNT(*) AS number_user FROM userprofile'
  db.query(pullData, (err, result) => 
  { 
    if(err) throw err
    else res.send(result);
  });
})
// number of users for admin page

app.get('/grossIncome', (req, res) =>
{  
  var pullData = 'SELECT sum(grandtotal) AS gross_income FROM inv_header'
  db.query(pullData, (err, result) => 
  { 
    if(err) throw err
    else res.send(result);
  });
})
// gross income

// ========================= ADMIN - User List =========================

app.get('/userList', (req, res) =>
{  
  var pullData = 'SELECT username, email, fullname, phone, CreatedDate FROM userprofile'
  db.query(pullData, (err, result) => 
  { 
    if(err) throw err
    else res.send(result);
  });
})
// User List for Admin page

// ========================= ADMIN - User's payment =========================

app.get('/unpaidList', (req, res) =>
{  
  var pullData = `SELECT DISTINCT orderID, username, orderDate,
  sum(subtotal)+dev_price AS total FROM checkout JOIN userprofile ON checkout.user_id=userprofile.id 
  WHERE itemstatus_id="1" GROUP BY orderID`
  db.query(pullData, (err, result) => 
  { 
    // take data from checkout that needed to be confirmed its payment status by admin (itemstatus_id=5 means process)
    // the result will displayed in Need Process Tab in User's Payment page at admin
    if(err) throw err
    else 
    {
      res.send(result);
      // console.log(result);
    }
  });
})
// User Unpaid List for Admin page

app.post('/UnpaidView', (req, res) =>
{
  var orderID = req.body.orderID;

  var takeData = `SELECT * FROM checkout WHERE orderID=?`;
  db.query(takeData, [orderID], (err, results) =>
  {
    if (err) throw err;
    else
    {
      // console.log(results)
      res.send(results);
    }
  })
})
// take unpaid list for admin view

app.get('/NPList', (req, res) =>
{  
  var pullData = `SELECT DISTINCT orderID, username, orderDate,
  sum(subtotal)+dev_price AS total FROM checkout JOIN userprofile ON checkout.user_id=userprofile.id 
  WHERE itemstatus_id="5" GROUP BY orderID`
  db.query(pullData, (err, result) => 
  { 
    // take data from checkout that needed to be confirmed its payment status by admin (itemstatus_id=5 means process)
    // the result will displayed in Need Process Tab in User's Payment page at admin
    if(err) throw err
    else 
    {
      res.send(result);
      // console.log(result);
    }
  });
})
// User NeedProcess List for Admin page

app.post('/NPView', (req, res) =>
{
  var orderID = req.body.orderID;

  var takeData = `SELECT * FROM checkout WHERE orderID=?`;
  db.query(takeData, [orderID], (err, results) =>
  {
    if (err) throw err;
    else
    {
      // console.log(results)
      res.send(results);
    }
  })
})
// take need process list for admin view

app.post('/paymentSuccess', (req, res) =>
{
  var orderID = req.body.orderID
  // console.log(orderID)

  var updateCheckout = `UPDATE checkout SET itemstatus_id="3" WHERE orderID="${orderID}";`
  updateCheckout += `UPDATE cart SET cart.checkoutstat_id="3" WHERE id IN (SELECT checkout.cart_id FROM checkout
  WHERE checkout.orderID="${orderID}");`
  updateCheckout += `SELECT * FROM checkout WHERE orderID="${orderID}"`
  db.query(updateCheckout, (err, result) => 
  {
    // query 1: update table checkout, before was unpaid (1), now become paid (3)
    // query 2: update table cart, before was unpaid (1), now become paid (3)
    // query 3: select all from checkout with desire orderID (order id that already confirmed by admin)
    // to be inserted into inv_detail table
    if (err) throw err
    else
    {
      // console.log(result[2])
      var dataforINV = result[2]
      // console.log(dataforINV)
      // take data for selected orderID (result of query 2 above that wil be inserted into inv_detail table)
      
      var takeorderID = 'SELECT INV FROM inv_detail'
      db.query(takeorderID, (err, results) =>
      {
        // takeorderID query to see the latest invoice code, to generate new inv code
        if (err) throw err
        else
        {
          var length = results.length;
          // console.log(length)
          // console.log(results)
          
          var lastINV = 0;
          (length === 0) ? lastINV = 0 : lastINV = parseInt(results[length-1].INV);
          var INV = lastINV + 1;
          var INVcode = '';
          
          if (INV < 10)  INVcode = INVcode + '0000' + INV
          else if (INV >= 10 && INV < 100) INVcode = INVcode + '000' + INV
          else if (INV >= 100 && INV < 1000) INVcode = INVcode + '00' + INV
          else if (INV >= 1000 && INV < 10000) INVcode = INVcode + '0' + INV
          else INVcode = INVcode + INV
          // generate Invoice Code
          // console.log(INVcode)

          intoINVHead = () => 
          {
            var pullData = `SELECT DISTINCT INV, user_id, orderDate,
            sum(subtotal)+dev_price AS grandtotal FROM inv_detail 
            WHERE itemstatus_id="3" AND INV="${INVcode}"`
            db.query(pullData, (err, result) => 
            { 
              // pull data from inv_detail then inserted into inv_header
              if(err) throw err
              else 
              {
                // console.log(result[0].orderDate)
                var itemstatus_id = 3; // 3 means paid
                var userID = result[0].user_id;
                var INVCode = result[0].INV;
                var GrandTotal = result[0].grandtotal;
                var orderDate = result[0].orderDate;
                var insertINV_header = `INSERT INTO inv_header SET user_id=?,
                INV=?, grandtotal=?, itemstatus_id=?, orderDate=?`
                db.query(insertINV_header, [userID, INVCode, GrandTotal, itemstatus_id, orderDate], (err, result) => 
                {
                  // query above to insert the data into inv_header (data from inv_detail)
                  if (err) throw err;
                  else res.send('1')
                })
              }
            });
          }

          var counts = 0;
          for (var i=0; i<dataforINV.length; i++)
          {
            // loop for the item list
            var itemstatus_id = 3; // 3 means paid
            var insertINV_detail = `INSERT INTO inv_detail SET user_id=?, orderID=?, INV=?,
            prod_name=?, prod_price=?, quantity=?, subtotal=?,
            ship_name=?, ship_add=?, ship_phone=?, bank=?,
            dev_meth=?, dev_price=?, itemstatus_id=?, orderDate=?`;
            db.query(insertINV_detail,
            [dataforINV[i].user_id, dataforINV[i].orderID, INVcode,
            dataforINV[i].prod_name, dataforINV[i].prod_price,
            dataforINV[i].quantity, dataforINV[i].subtotal,
            dataforINV[i].ship_name, dataforINV[i].ship_add,
            dataforINV[i].ship_phone, dataforINV[i].bank,
            dataforINV[i].dev_meth, dataforINV[i].dev_price,
            itemstatus_id, dataforINV[i].orderDate],
            (err, results) =>
            {
              // query above to insert selected data from checkout table (query 2 of updateCheckout) into inv_detail table
              if (err) throw err
              else
              {
                counts++
                if (counts === dataforINV.length) intoINVHead()
                // counts === dataforINV.length because the if else in this query executed as much as the dataforINV.length
                // to make sure the intoINVHead() only called one time, we have to use this if-else
              }
            })
          }
        }
      })
    }
  })
})
// payment confirmed by admin - success

app.get('/paidList', (req, res) =>
{  
  var pullData = `SELECT username, INV, grandtotal, orderDate
  FROM inv_header JOIN userprofile
  ON inv_header.user_id=userprofile.id WHERE inv_header.itemstatus_id="3" GROUP BY INV ORDER BY INV`
  db.query(pullData, (err, result) => 
  { 
    // take all data that the payment already confirmed (with status = success/paid payment only)
    if(err) throw err
    else 
    {
      res.send(result);
    }
  });
})
// User paid List for Admin page


app.listen(8081);