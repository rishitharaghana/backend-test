
const moment = require("moment");
const pool = require("../config/db");
const util = require("util");

const queryAsync = util.promisify(pool.query).bind(pool);
const getAllEmployeeCount = async (req,res)=>{
    try {
        const query = `SELECT * FROM employees`;
        const results = await queryAsync(query);
        if (results.length == 0){
            return res.status(404).json({message:'No employess found'});
        }
        res.status(200).json({results});
    } catch (error) {
        console.error('Error fetching employees',error);
        res.status(500).json({message:'Internal Server Error'});
    }
}
const getAllEMployeesByTypeSearch = async (req,res)=>{
    const {user_type,id} = req.query;
    let sql = "SELECT * FROM employees";
    let countSql = "SELECT COUNT(*) AS count FROM employees";
    let whereClauses = [];
    let values = [];
    if (user_type){
        whereClauses.push("user_type = ?");
        values.push(user_type);
    }
    //assigned users
    if (id){
        whereClauses.push("id LIKE ?");
        values.push(`$${id}`);
    }
  
    if (whereClauses.length > 0){
        const whereStr = " WHERE " + whereClauses.join(" AND ");
        sql += whereStr;
        countSql += whereStr;
    }
    pool.query(countSql,values,(err,countResult)=>{
       
        if (err) {
            console.error(err);
            return res.status(500).json({error:'Database Query failed'});
        }
        const userCount = countResult[0].count;

        pool.query(sql,values,async (error,employees)=>{
            if (error){
                console.error(error);
                return res.status(500).json({error:'Database query failed'});
            }
            
            try {
                const employeeIds = employees.map((emp)=> emp.id);
                console.log(employeeIds);
                if (employeeIds.length == 0){
                    return res.status(200).json({success:true,count:0,data:[]});
                }
                const empPlaceholders = employeeIds.map(() => "?").join(",");
                //get Asssigned users;
                 const [userErr, users] = await new Promise((resolve) => {
                    const userSql = `
                    SELECT id, user_type, photo, name, mobile, email, city, address,
                    subscription_package, subscription_start_date, subscription_expiry_date,
                    subscription_status, assigned_emp_id, assigned_emp_type, assigned_emp_name
                    FROM users
                    WHERE assigned_emp_id IN (${empPlaceholders})
                `;
                    pool.query(userSql, employeeIds, (err, result) =>
                    resolve([err, result])
                    );
                });
                if (userErr) throw userErr;
                 const employeeUserMap = {};
                    users.forEach((user) => {
                        const empId = user.assigned_emp_id;
                        const activityDate = latestActivityMap[empId]
                        ? moment(latestActivityMap[empId]).format("YYYY-MM-DD")
                        : null;

                        const userWithActivity = {
                        ...user,
                        created_date: activityDate,
                        };

                        if (!employeeUserMap[empId]) employeeUserMap[empId] = [];
                        employeeUserMap[empId].push(userWithActivity);
                });


                const enrichEmployees = employees.map((emp)=>({
                    ...emp,
                    created_date: emp.created_date ? moment(emp.created_date).format('YYYY-MM-DD') :null,
                    created_time : emp.created_time ? moment(emp.created_time,"HH:mm:ss").format("HH:mm:ss") : null,
                     assigned_users: employeeUserMap[emp.id] || [],
                }));
                res.status(200).json({
                    success:true,
                    count:userCount,
                    data:enrichEmployees
                })
                
                
            } catch (error) {
                console.error("Unexpected error",error);
                res.status(500).json({error:"Internal serval error"});
            }
        })

    })
}

module.exports = {
    getAllEmployeeCount,
    getAllEMployeesByTypeSearch
}