//SET UP EXPRESS
var express = require('express');
var app = express();

//For config files
var fs = require('fs');
var path = require('path');

//For executing python script
var spawnSync = require("child_process").spawnSync;


var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

var engines = require('consolidate');
app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', __dirname); // tell Express where to find templates, in this case the '/templates' directory
app.set('view engine', 'html'); //register .html extension as template engine so we can render .html pages 

app.use(express.static(__dirname + '/public')); //client-side js & css files

var stateCodes = {
			    "AL": "Alabama","AK": "Alaska","AZ": "Arizona","AR": "Arkansas","CA": "California","CO": "Colorado","CT": "Connecticut","DE": "Delaware","DC": "District Of Columbia","FL": "Florida","GA": "Georgia","HI": "Hawaii","ID": "Idaho","IL": "Illinois","IN": "Indiana","IA": "Iowa","KS": "Kansas","KY": "Kentucky","LA": "Louisiana","ME": "Maine","MD": "Maryland","MA": "Massachusetts","MI": "Michigan","MN": "Minnesota","MS": "Mississippi","MO": "Missouri","MT": "Montana","NE": "Nebraska","NV": "Nevada","NH": "New Hampshire","NJ": "New Jersey","NM": "New Mexico","NY": "New York","NC": "North Carolina","ND": "North Dakota","OH": "Ohio","OK": "Oklahoma","OR": "Oregon","PA": "Pennsylvania","RI": "Rhode Island","SC": "South Carolina","SD": "South Dakota","TN": "Tennessee","TX": "Texas","UT": "Utah","VT": "Vermont","VA": "Virginia","WA": "Washington","WV": "West Virginia","WI": "Wisconsin","WY": "Wyoming"
			}

//ROUTING
app.get('/', function(req, res){

	res.render('index.html');
});

app.get('/states', function(req, res){
	res.send(JSON.stringify(stateCodes));
});

//This is to get all data for drawing the map
app.get('/state/:name/:detailopt', function(req, res){

	var statejson = fs.readFileSync('states.json');
	var state = JSON.parse(statejson).features.find(state => (state.properties.NAME == stateCodes[req.params.name]));

	var	stateGeom = state.geometry;//get the geometry/coordinates corresponding to the state in question
	var zoom = (11.5 - Math.log10(state.properties.CENSUSAREA));
	console.log(zoom);

	var detail_opt = req.params.detailopt;
	console.log(detail_opt);
	var census_blocks, poly_file;

	if (detail_opt == 'true') {
		console.log('we out here');
		polygon_file = 'polygons_subtract_'+req.params.name;
	}

	else {
		polygon_file = 'polygons_'+req.params.name;
	}


	fs.readFile('../binary_data/district_polygons/'+polygon_file, 'utf8', function(err, data){

		if (err){
			console.log('There does not already exist a file with the polygons for this districting of this state');
			console.log(err);
			res.sendStatus(404);
		}
		else {
			if (detail_opt == 'true'){
				raw_blocks = fs.readFileSync('../binary_data/census_polygons/boundary_blocks_'+req.params.name).toString('utf-8');
				census_blocks = JSON.parse(raw_blocks);

			}
			else {
				census_blocks = [];
			}
			var polygons = JSON.parse(data.replace(/\(/g, '\[').replace(/\)/g, '\]'));
			var json = {"polygons":polygons, "geometry":stateGeom, "blocks": census_blocks, "zoom":zoom};
			res.send(JSON.stringify(json));
		}

	});
});

//SERVER SET UP

app.listen(8080, function(){
	console.log('– Server listening on port 80');
});

process.on('SIGINT', function(){
	console.log('\nI\'m closing');
	process.exit(0);
});