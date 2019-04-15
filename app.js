var backgroundColorR = 0.75;
var backgroundColorG = 0.85;
var backgroundColorB =  0.8;

var xRotationMatrix = new Float32Array(16);
var yRotationMatrix = new Float32Array(16);
var zRotationMatrix = new Float32Array(16);

var worldMatrix = new Float32Array(16);
var viewMatrix = new Float32Array(16);
var projMatrix = new Float32Array(16);

var animationFlag = 0;

var matWorldUniformLocation;
var matViewUniformLocation;
var matProjUniformLocation;

var gl;
var rotationFlag = 1;

var InitDemo = function () {
	
	loadTextResource('./shader.vs.glsl', function (vsErr, vsText) {
		if (vsErr) {
			alert('Fatal error getting vertex shader (see console)');
			console.error(vsErr);
		} else {
			loadTextResource('./shader.fs.glsl', function (fsErr, fsText) {
				if (fsErr) {
					alert('Fatal error getting fragment shader (see console)');
					console.error(fsErr);
				} else {
					loadJSONResource('./ProjectModel(2).json', function (modelErr, modelObj) {
						if (modelErr) {
							alert('Fatal error getting House model (see console)');
							console.error(fsErr);
						} else {
							loadImage('./houseTexture.png', function (imgErr, img) {
								if (imgErr) {
									alert('Fatal error getting House texture (see console)');
									console.error(imgErr);
								} else { 
									RunDemo(vsText, fsText, img, modelObj);
								}
							});
						}
					});
				}
			});
		}
	});
};

var RunDemo = function (vertexShaderText, fragmentShaderText, houseImage, houseModel) {
	console.log('This is working');
	var canvas = document.getElementById('myCanvas');
	gl = canvas.getContext('webgl');
	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(backgroundColorR, backgroundColorG, backgroundColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	//
	// Create shaders
	// 
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
		return;
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
		return;
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		return;
	}

	//
	// Create buffer
	//
	var vertices = houseModel.meshes[0].vertices;
	var houseIndices = [].concat.apply([], houseModel.meshes[0].faces);
	var houseTexCoords = houseModel.meshes[0].texturecoords[0];

	var housePosVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, housePosVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	var houseTexCoordVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, houseTexCoordVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(houseTexCoords), gl.STATIC_DRAW);

	var houseIndexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, houseIndexBufferObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(houseIndices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, housePosVertexBufferObject);
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attribute location
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, houseTexCoordVertexBufferObject);
	var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
	gl.vertexAttribPointer(
		texCoordAttribLocation, // Attribute location
		2, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0
	);
	gl.enableVertexAttribArray(texCoordAttribLocation);

	//
	// Create texture
	//
	var houseTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, houseTexture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		houseImage
	);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// Tell OpenGL state machine which program should be active.
	gl.useProgram(program);

	matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 10, -25], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);
	
	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

	

	//
	// Main render loop
	//
	
	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);
	angle = 0;
	var xAngle = 0;
	var loop = function () {
		angle = performance.now() / 1000 / 6 * 2 * Math.PI;
		if(rotationFlag==1)
			mat4.rotate(yRotationMatrix, identityMatrix, angle, [0, 1, 0]);
		else
			mat4.rotate(yRotationMatrix, identityMatrix, -angle, [0, 1, 0]);
		xAngle = -94 * Math.PI /180;
		mat4.rotate(xRotationMatrix, identityMatrix, xAngle, [1, 0, 0]);
		mat4.mul(worldMatrix, yRotationMatrix, xRotationMatrix);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		gl.clearColor(backgroundColorR, backgroundColorG, backgroundColorB, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		gl.bindTexture(gl.TEXTURE_2D, houseTexture);
		gl.activeTexture(gl.TEXTURE0);

		gl.drawElements(gl.TRIANGLES, houseIndices.length, gl.UNSIGNED_SHORT, 0);
		requestAnimationFrame(loop);
		//setTimeout(loop,speed);
	};
	requestAnimationFrame(loop);
	//setTimeout(loop,speed);
	canvas.onmousedown = function (ev) { click(gl); };
	var flag = 0;
	function click(gl)
	{
	   if(flag ==0)
	   {
		   mat4.lookAt(viewMatrix, [0, 0, -50], [0, 0, 0], [0, 1, 0]);
		   gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
			flag= 1;
		}
		else{
			mat4.lookAt(viewMatrix, [0, 0, -25], [0, 0, 0], [0, 1, 0]);
			gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
			flag= 0;
		}
	}
	window.addEventListener("keydown", keyBoardEvents, false);
	function keyBoardEvents(e) {
    switch(e.keyCode) {
        case 37:
            mat4.lookAt(viewMatrix, [0, 0, -50], [0, 0, 0], [0, 1, 0]);
			gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
            break;
        case 38:
			mat4.lookAt(viewMatrix, [0, 0, -25], [0, 0, 0], [0, 1, 0]);
			gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
            break;
        case 39:
            
            break;
        case 40:
            // down key pressed
            break;  
		}   
	}
};
var flag = 0;
function changeBackground(){
	if(flag == 0){
		backgroundColorR = 1.0;
		backgroundColorG = 1.0;
		backgroundColorB =  1.0;
		console.log(backgroundColorR,backgroundColorG,backgroundColorB);
		flag = 1;
		}
	else{
		backgroundColorR = 0.0;
		backgroundColorG = 0.0;
		backgroundColorB = 0.0;
		console.log(backgroundColorR,backgroundColorG,backgroundColorB);
		flag  = 0;
	}
}
function changeCamera(){
	mat4.lookAt(viewMatrix, [0, 20, -25], [0, 0, 0], [0, 1, 0]);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
}
function changeRotation(){
	if(rotationFlag ==1)
		rotationFlag = 0;
	else
		rotationFlag =1;
}