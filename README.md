# district-live
This repository contains only the required files for a web-based version of Philip Klein's redistricting work. Currently, the site only displays pre-computed redistricting plans for each state, but we hope to run the algorithm and display the results live in the future. The current version is running at ec2-18-222-6-118.us-east-2.compute.amazonaws.com. Created by Megan Gessner. 

# structure
/mini_server ~ a node server. to run it locally, cd into this directory locally (after cloning this repo) and type "node server.js". this will launch a server listening on port 8080 and it has the same functionality as the live version. 
    /public ~ contains public files. client-side functionality in index.js
    server.js ~ the site is a single page, so the routing set up in here is to handle get requests from index.js. i've commented what each route accomplishes in the file itself
/web_data ~ contains all polygonal data necessary to draw a redistricted plan for each state available, pre-processed from the full district repo to be ready for this particular server 
    /census_polygons ~ contains polygonal data of the census blocks that line the boundaries of each district. sometimes census blocks will lie on the border of two or more districts, so it is assigned to one of them in pklein's algorithm. you will see these are JSON files containing a color (district) assignment as each key with multi-polygon representation of all the census blocks that were assigned to that district as the corresponding value. 
    /district_polygons ~ contains polygonal data of the main "power cell" of each district. if you look at the live site, and toggle "census boundary block detail" option off, you will see straight-lined districts, without the fuzzy boundaries given by the census blocks. those are the polygons stored here. 
    

