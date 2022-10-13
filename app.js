let express = require("express");
let app = express();

let { open } = require("sqlite");
let sqlite3 = require("sqlite3");
let path = require("path");
app.use(express.json());

let dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeServerAndDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at https://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeServerAndDatabase();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const stateQuery = `
    SELECT * FROM state;
    
    `;

  const statesArray = await db.all(stateQuery);

  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateIdQuery = `
       SELECT * FROM state 
       WHERE state_id = ${stateId};
    `;

  const stateArray = await db.get(getStateIdQuery);

  response.send(convertStateDbObjectToResponseObject(stateArray));
});

app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = ` 
   INSERT INTO district (state_id,district_name,cases,cured,active,deaths)
   VALUES (
 ${stateId} , '${districtName}' , ${cases},${cured},${active},${deaths}
   );
`;

  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const districtQuery = ` 
    SELECT * FROM district 
    WHERE district_id = ${districtId};
    
    `;
  const districtArray = await db.get(districtQuery);

  response.send(convertDistrictDbObjectToResponseObject(districtArray));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const districtDeleteQuery = `
    DELETE 
    FROM district 
    WHERE district_id = ${districtId};
    
    `;

  await db.run(districtDeleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
   UPDATE  district 
    SET district_name = '${districtName}',
         state_id = ${stateId},
         cases = ${cases},
         cured = ${cured},
         active = ${active},
         deaths = ${deaths}
    WHERE district_id = ${districtId}; 
    `;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const totalCasesQuery = `
      SELECT SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
      FROM district
      WHERE state_id = ${stateId};
    
    `;
  const stats = await db.get(totalCasesQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;

  const districtQuery = ` 
       
      SELECT state_name 
      FROM district 
      NATURAL JOIN state 
      WHERE district_id = ${districtId};
    
    `;
  const stateName = await db.get(districtQuery);

  response.send({ stateName: stateName.state_name });
});

module.exports = app;
