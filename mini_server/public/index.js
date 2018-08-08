$(document).ready(function(){

			var map, districtLayers, boundlayer;

			setupmap('RI');//default state


			///////////////////
			//  STATE LIST   //
			///////////////////
			$.get('/states', function(data, status){
				makeStateList(JSON.parse(data));

			});

			//Dynamically loads the list of states
			function makeStateList(states){
				for (var i in states){
					var para = document.createElement("p");
					$(para).html(states[i]);
					$(para).prop("code", i);
					$('#state-list').append(para);
				}
			}

			//Functionality for searching thru states
			$('#state-search').on('keyup search', function(e){
				var letters = $('#state-search').val();
				var states = $('#state-list').children();

				for (var i in states){
					var state = states[i].innerHTML;
					console.log(states[i].innerHTML);
					if (!state.startsWith(letters)){
						$(states[i]).css('display','none');
					}
					else {
						$(states[i]).css('display','block');
					}

				}

			});


			///////////////////////////
			//FORM/EVENT HANDLERS ///////////
			///////////////////////////

			$('#redistrictForm').submit(redistrict);
			$('#detail-option').on('change', toggleDetail);

			//adds or removes census block detailing on boundaries
			function toggleDetail(event){
				$('#loading-gif').css('display', 'block');

				var center_coords = map.getView().getCenter();
				var loading = new ol.Overlay({
  					element: document.getElementById('loading-gif'),
  					position: center_coords,
  					positioning: 'center-center'
				});
				//loading.setPosition(center_coords);
				map.addOverlay(loading);
				map.renderSync();

				var detail_option = $('#detail-option').prop('checked');
				console.log(detail_option);
				var state = $('#state-input').val();

				$.get('/state/'+state+'/'+detail_option,  function(res){
					
					drawDistricts(res);

					$('#loading-gif').css('display', 'none');

				});
				event.preventDefault();
			}

			//gets new districting borders and changes layers on map
			function redistrict(event){
				event.preventDefault();

				$('#loading-gif').css('display', 'block');

				var center_coords = map.getView().getCenter();
				var loading = new ol.Overlay({
  					element: document.getElementById('loading-gif'),
  					position: center_coords,
  					positioning: 'center-center'
				});
				//loading.setPosition(center_coords);
				map.addOverlay(loading);
				map.renderSync();
				console.log(center_coords);

				var number = $('#number-input').val();
				var state = $('#state-input').val();
				var censusopt = $('#census-option').val();

				$.post('/redistrict', {number: number, state: state, detailopt: detailopt}, function(res){

					drawDistricts(res);
					//map.removeOverlay(loading);
					$('#loading-gif').css('display', 'none');

				})
			}


			$(document).on('click', 'p', function(){
				var code = $(this).prop("code");

				$('#state-input').val(code);
				panToState(code);
			});


			///////////////
			//DRAWING MAP//
			///////////////

			//Pans to clicked state
			function panToState(state){
				var detail_option = $('#detail-option').prop('checked');
				$.get('/state/'+state+'/'+detail_option, function(data, status){
					drawDistricts(data);
				})
			}

			//Redraws district boundaries at center of state
			function drawDistricts(data){
				var json = JSON.parse(data);
				var stateData = json.geometry;
				var districts = json.polygons;
				var blocks = json.blocks;
				var zoom = json.zoom;

				map.getView().setCenter(ol.proj.fromLonLat(stateData.center));
				map.removeLayer(boundlayer);
				for (var i in districtLayers){
					map.removeLayer(districtLayers[i]);
				}
				var newlayers = formLayers(stateData.type, stateData.coordinates, stateData.center, districts, blocks);

				for (var j in newlayers){
					map.addLayer(newlayers[j]);
					console.log(map.getLayers());
				}
				map.getView().setZoom(zoom);
				console.log(status);
			}

			//Initial drawing of map
			function setupmap(state){

				$.get('/state/'+state+'/true', function(data, status){

					var json = JSON.parse(data);

					var stateData = json.geometry;
					var districts = json.polygons;
					var zoom = json.zoom;
					var blocks = json.blocks;

					console.log(districts);

					createmap(stateData.type, stateData.coordinates, stateData.center, zoom, districts, blocks);
				})
			}


			//Forms the layers and their geometries but doesn't draw layers. 'blocks' is census block boundaries
			function formLayers(type, coords, center, districts, blocks) {
				var geometry;
				var boundfeature = new ol.Feature({});

				if (type == 'Polygon'){
					geometry = new ol.geom.Polygon(coords);
				}

				else if (type == 'MultiPolygon'){
					var geometry = new ol.geom.MultiPolygon(coords);
				}

				geometry.transform('EPSG:4326', 'EPSG:3857');
				boundfeature.setGeometry(geometry);

				districtLayers = drawDistrictLayers(districts, geometry, blocks);

				boundlayer = new ol.layer.Vector({
				    source: new ol.source.Vector({
				        features: [boundfeature]
				    }),
				    style: new ol.style.Style({
				    	stroke: new ol.style.Stroke({
				    		width: 3,
				    		color: 'black'
				    	}),
				    	fill: new ol.style.Fill({
				    		color: 'white'
				    	})
				    }),
				    opacity: 0.5
				})

				return (districtLayers.concat([boundlayer]));
			}

			//Returns the ol map object... only on page reload. 'blocks' is polygons of census block boundaries
			function createmap(type, coords, center, zoom, districts, blocks) {
				var layers = formLayers(type, coords, center, districts, blocks);

				var osm = new ol.layer.Tile({
					source: new ol.source.OSM(),
					opacity: 0.75
				})

				map = new ol.Map({
					target: 'map',
		        	layers: [osm].concat(layers),
		        	view: new ol.View({
		        		center: ol.proj.fromLonLat(center),
		          		zoom: zoom
		        	})
		      	});

			}

			//clips polygon vector to stay within the outline of the state
			function clipPolygon(vector, geometry){
				//https://gist.github.com/elemoine/b95420de2db3707f2e89
					vector.on('precompose', function(event) {
				        var ctx = event.context;
          				var vecCtx = event.vectorContext;
				        ctx.save();

				        var fillStyle = new ol.style.Style({fill: new ol.style.Fill({color: [0, 0, 0, 0]})});


				        vecCtx.setStyle(fillStyle);
				        vecCtx.drawGeometry(geometry);
				        
				        ctx.clip();
				        
				      });

				    vector.on('postcompose', function(event) {
				        var ctx = event.context;
				        ctx.restore();
				      });
			}


			function dimension(list){
				console.log(list[0][0]);
				console.log(typeof(list[0][0]));
				if (typeof(list[0][0]) == "number") {
					return 2
				}
				else {
					return 3
				}
			}

			//Forms vector drawings of district layers, doesn't add to map yet
			function drawDistrictLayers(coords, geometry, blocks){

				var layers = [];
				var colors = [];

				//district vectors
				for (var i in coords){

					var geom;
					if (dimension(coords[i]) == 2) {
						var geom = new ol.geom.Polygon([coords[i]]);
					}
					else {
						var geom = new ol.geom.MultiPolygon([coords[i]]);
					}

					geom.transform('EPSG:4326', 'EPSG:3857');

					color = getRandomColor().toString();
					colors.push(color);

					var vector = new ol.layer.Vector({
				    	source: new ol.source.Vector({
				        	features: [new ol.Feature({
				        		geometry: geom
				        	})]
				    	}),
				    	style: new ol.style.Style({

				    		fill: new ol.style.Fill({
				    			color: color
				    		})
				    	}),
				    	opacity: 0.5
					});

					clipPolygon(vector, geometry);

					layers.push(vector);
				}

				//census boundary vectors

				for (var j in Object.keys(blocks)){
					console.log(blocks[j]);

					var geom = new ol.geom.MultiPolygon([blocks[j]]);
					geom.transform('EPSG:4326', 'EPSG:3857');

					var vector = new ol.layer.Vector({
			    	source: new ol.source.Vector({
			        	features: [new ol.Feature({
			        		geometry: geom
			        	})]
				    }),
				   	style: new ol.style.Style({
				   		fill: new ol.style.Fill({
				   			color: colors[j]
				   		})
				   	}),
					   	opacity: 0.5
					});

					//https://gist.github.com/elemoine/b95420de2db3707f2e89
					clipPolygon(vector, geometry);

					layers.push(vector);

				}

				return layers;
			}


			//https://stackoverflow.com/questions/1484506/random-color-generator
			function getRandomColor() {
  				var letters = '0123456789ABCDEF';
  				var color = '#';
  				for (var i = 0; i < 6; i++) {
    				color += letters[Math.floor(Math.random() * 16)];
  				}
  				return color;
			}


		   
		});