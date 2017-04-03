var modhash = window.reddit.modhash;
var currentVersion = 12;
var drawingData = {
	startX:50,
	startY:0,
	kill:false,
	colors:[[5,5,5],[5,5,5]],
	newVersion: -1
};

var intervalId = -1;
var secondsLeft = -1;

var currentX = 0;
var currentY = 0;

function start(){
	updateGoal();
	setInterval(() => updateGoal(), 120 * 1e3);
	setTimeout(() => checkPixels(), 2000);
}

// Haalt de opdracht op van github
function updateGoal() {
	console.log("Updating target area... Ceterum censeo The Void esse delendam");
	const url = 'https://raw.githubusercontent.com/mordalthunder/place/master/data/data.json' + '?no-cache=' + (new Date).getTime();
	//Hier komt later een functie om meerdere opdrachten te kunnen verdelen over gebruikers
	fetch(url)
	.then((resp) => resp.json())
	.then(function(data) {
		// Werk de variabele bij die teken-data bjihoud
		drawingData.startX = data.startX;
		drawingData.startY = data.startY;
		drawingData.colors = data.colors;
		if (currentVersion < data.newVersion) {
			// dit moet nog iets beter uitgewerkt worden
			//document.body.innerHTML = '<center><br><br><br><br><br><br><h1 style="font-size: 20pt;">Je script is verouderd! Download alsjeblieft de nieuwe update (v' + data.newVersion + '). <br><br><br><p style="font-size: 14pt;">Als je het script hebt geïnstalleerd via een bladwijzer hoef je alleen de pagina te herladen en de bladwijzer opnieuw te gebruiken.</p><br><br><a href=https://raw.githubusercontent.com/Sadye/rPlace/master/script.js>Script</a> | <a target="_blank" href="https://discord.gg/EU4NhBn">Discord</a> | <a target="_blank" href="https://github.com/Sadye/rPlace">Github</a></h1></center>';
			alert('New update ready!, Please reload page and press the Bookmark again!!');
			return;
		}
		if (drawingData.kill && !data.kill) {
			// Script moet weer uitgevoerd worden nadat de killswitch was uitgevoerd
			console.log("Script was restarted!");
			setTimeout(checkPixels(), 2000);
		}
		drawingData.kill = data.kill;
		// Neem een willekeurige x en y uit de teken-data
		currentY = Math.floor(Math.random() * drawingData.colors.length);
		currentX = Math.floor(Math.random() * drawingData.colors[currentY].length);
		console.log("Succesfully acquired new target area");
	})
	.catch(function(error) {
		console.log(error);
		console.log("Trying again: ");
		setTimeout(() => updateGoal(), 5000);
	});
}

function checkPixels() {
	// killswitch
	if (drawingData.kill) {
		console.log("Script has been paused...");
		window.clearInterval(intervalId);
		return;
	}
	var tempX = currentX;
	var tempY = currentY;
	while (getTileAt(currentX + drawingData.startX, currentY + drawingData.startY) == drawingData.colors[currentY][currentX] || drawingData.colors[currentY][currentX] == -1) {
		currentX++;
		if (currentX > drawingData.colors[currentY].length - 1) {
			currentY += 1;
			currentX = 0;
		}
		if (currentY > drawingData.colors.length - 1) {
			currentY = 0;
		}

		if (tempX == currentX && tempY == currentY) {
			// Alles is gecontroleerd, geen nieuwe pixels
			// Probeer opnieuw in 10s
			setTimeout( () => checkPixels(), 10);
			return;
		}
	}
	// remove info message interval
	window.clearInterval(intervalId);
	setTimeout( () => {
		// probeer nieuwe pixel na 1 seconde
		// ga automatisch naar volgende regel of terug naar start
		// als we buiten het canvas komen
		if (currentX > drawingData.colors[currentY].length - 1) {
			currentY += 1;
			currentX = 0;
		}
		if (currentY > drawingData.colors.length - 1) {
			currentY = 0;
		}
		// negeer transparente pixels
		if (drawingData.colors[currentY][currentX] == -1) {
			currentX++;
			setTimeout( () => checkPixels(), 0);
			return;
		}
		var ax = currentX + drawingData.startX;
		var ay = currentY + drawingData.startY;
		console.log("Checking pixel on ("+ ax + ", " + ay +"). It should be: " + getColorName(drawingData.colors[currentY][currentX]) + ". It is currently: " + getColorName(getTileAt(ax, ay)));
		console.log("If you see another check below it means someone was faster as you to update.");
		// zoek naar de correcte kleur
		$.get("https://www.reddit.com/api/place/pixel.json?x=" + ax + "&y=" + ay)
		.then(res => {
			if (res.color == drawingData.colors[currentY][currentX]) {
	    		// kleur klopt, controleer volgende pixel
	    		currentX++;
	    		setTimeout( () => checkPixels(), 0);
	    		return;
	    	} else {
	    		// kleur is fout, kleur wordt vervangen
	    		setTimeout( () => drawPixel(), 0);
	    		return;
	    	}
	    }).fail(res => {
	    	// een error, probeer opnieuw over 10s
	    	currentX++;
	    	setTimeout( () => checkPixels(), 10 * 1e3);
	    	return;
	    })
	}, 1000);
}

// tekent een pixel
function drawPixel() {
	setTimeout( () => {
		// bereken de x, y , kleur
		var ax = currentX + drawingData.startX;
		var ay = currentY + drawingData.startY;
		var newColor = drawingData.colors[currentY][currentX];
		// probeer het tekenen
		console.log("Drawing pixel on location (" + ax + ", " + ay + ") Color: "+getColorName(newColor)+" (old: "+getColorName(getTileAt(ax, ay)) +") (https://www.reddit.com/r/place/#x=" + ax + "&y=" + ay + ")");
		$.ajax({ url: "https://www.reddit.com/api/place/draw.json", type: "POST",
			headers: { "x-modhash": modhash }, data: { x: ax, y: ay, color: newColor }
		})
		.done( res => {
        	// tekenen is gelukt
        	// opnieuw proberen na 10s
        	setTimeout(() => {
        		checkPixels()
        	}, res.wait_seconds * 1e3)
        	console.log("Succes! New attempt in " + res.wait_seconds + " seconds.");

        	// laat mensen weten dat het nog werkt
        	secondsLeft = res.wait_seconds;
        	intervalId = setInterval( () => {
        		secondsLeft -= 10;
        		console.log("" + secondsLeft + " Seconds until next action!");
        	}, 10 * 1e3)
        	return;
        })
		.error( res => {
			if (res.responseJSON) {
	        	// De aftelfunctie is niet gelukt
	        	// Geef error-melding. Als er een http-error is (status 429)
	        	// gebruik dan die waarde voor de volgende actie, anders opnieuw proberen in 10s
	        	setTimeout(() => {
	        		checkPixels()
	        	}, Math.max(Math.ceil(res.responseJSON.wait_seconds), 10) * 1e3);
	        	console.log("Problem, new attemplt in " + Math.max(Math.ceil(res.responseJSON.wait_seconds), 10) + " seconds.");
	        	
	        	// Info voor de gebruiker
	        	secondsLeft = Math.ceil(res.responseJSON.wait_seconds)
	        	intervalId = setInterval( () => {
	        		secondsLeft -= 10;
	        		console.log("Another " + secondsLeft + " seconds until next action!");
	        	}, 10 * 1e3)
	        } else {
	        	setTimeout(() => {
	        		checkPixels()
	        	}, 10* 1e3);
	        	console.log("problem! Trying again in " + 10 + " seconds.");
	        }
	        return;
	    });

	}, 500)
}

function getTileAt(x, y) {
	var colors = [
	{r: 255, g: 255, b: 255},
	{r: 228, g: 228, b: 228},
	{r: 136, g: 136, b: 136},
	{r: 34, g: 34, b: 34},
	{r: 255, g: 167, b: 209},
	{r: 229, g: 0, b: 0},
	{r: 229, g: 149, b: 0},
	{r: 160, g: 106, b: 66},
	{r: 229, g: 217, b: 0},
	{r: 148, g: 224, b: 68},
	{r: 2, g: 190, b: 1},
	{r: 0, g: 211, b: 221},
	{r: 0, g: 131, b: 199},
	{r: 0, g: 0, b: 234},
	{r: 207, g: 110, b: 228},
	{r: 130, g: 0, b: 128}
	];
	var data = document.getElementById("place-canvasse").getContext("2d").getImageData(x, y, 1, 1).data;
	return colors.findIndex(function(x) {return JSON.stringify(x) == JSON.stringify({r: data[0], g: data[1], b: data[2]});});
}

function getColorName(id) {
	if (id < 0 || id > 15) {
		return "???";
	}
	const colorScheme = [
	"white",
	"lgrey",
	"dgrey",
	"black",
	"pink",
	"red",
	"orange",
	"brown",
	"yellow",
	"lgreen",
	"green",
	"lblue",
	"blue",
	"dblue",
	"magenta",
	"purple",
	"nothing",
	];
	return colorScheme[id];
}

start();