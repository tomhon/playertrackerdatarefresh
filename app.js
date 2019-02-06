//main app runs restify web server - provides status update on a game or a player
const Sequelize = require('sequelize');
var restify = require('restify');
var server = restify.createServer();
server.use(restify.plugins.queryParser());

server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url); 
});

//setup Application Insights Monitoring 
const appInsights = require("applicationinsights");
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY);
appInsights.start();


const GameTrackingTable = require("./gameTrackingTableModel");

// load local model from database
// force: true will drop the table if it already exists
GameTrackingTable.sync({force:false}).then(() => {
    console.log('Database is online');
      });

GameTrackingTable.findAll().then(playerGameTrackingRow=> {
console.log(playerGameTrackingRow)
})

function processPlayerTrackingUpdate(res, query) //query.event defines what to do, query.requestGameStatus or query.requestPlayerStatus defines whether to provide a status update on the gameId or on the player with playerGameId
{
  //API call ?playerGameId=X&gameId=Y&event=Z
  //decide what to do 
  switch (query.event) {
    case 'requestGameStatus' : {
      GameTrackingTable.findOne({limit:1, where: {gameId: query.gameId}, 
        order: [['updatedAt', 'DESC']]}).then(gameStatus => {
          //TO DO: add logic to find most recent game update
        console.log('Game Status' , JSON.stringify(gameStatus.dataValues));
        res.send(query.event + ":" + JSON.stringify(gameStatus.dataValues));
        })
        return;
    }

    case 'requestPlayerStatus' : {
        GameTrackingTable.findOne({where: {playerGameId: query.playerGameId}}).then(playerStatus => {
          console.log('Player Status returned for: ' , JSON.stringify(playerStatus.dataValues.playerName));
          res.send(query.event + ":" + JSON.stringify(playerStatus.dataValues));

        })
        return;
      }
  }
  res.send(query.event + ": failed");
  return ('Update Request Failed')
}

server.get('/', function (req, res){
    console.log("Inbound Request:" , req.query);
    res.header('Access-Control-Allow-Origin', "*");
    var statusUpdateResponse = processPlayerTrackingUpdate(res,req.query);
    console.log('Outbound Response:', req.query.event + ":" + statusUpdateResponse);
    // res.send(req.query.event + ":" + statusUpdateResponse);
    // res.send(session.userData);
  
  });