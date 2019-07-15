// tilingRes is the resolution the triangles of the sphere are diced into; it's the number of points along each side
// of each triangle in the octahedron we start by tiling the sphere as...
var tilingRes = 100;

var lightAngle = 0;

var directionalLight;

// The various Points[] arrays are vertex positions for some basic polyhedra.
// Note that since the waves will be centered at the source points, these are
// essentially the vertices for the dual polyhedron to the one that the ripples
// will appear to be faces of.

var tetrahedronPoints = [
  1,  1,  1,
 -1, -1,  1,
 -1,  1, -1,
  1, -1, -1
];
var cubePoints = [
  1,  0,  0,
  0,  1,  0,
  0,  0,  1,
 -1,  0,  0,
  0, -1,  0,
  0,  0, -1
]
var octahedronPoints = [
  1,  1,  1,
 -1,  1,  1,
  1, -1,  1,
 -1, -1,  1,
  1,  1, -1,
 -1,  1, -1,
  1, -1, -1,
 -1, -1, -1
];
var dodecahedronPoints = [
      0,      1,  1.618,
      0,      1, -1.618,
      0,     -1,  1.618,
      0,     -1, -1.618,
  1.618,      0,      1,
 -1.618,      0,      1,
  1.618,      0,     -1,
 -1.618,      0,     -1,
      1,  1.618,      0,
      1, -1.618,      0,
     -1,  1.618,      0,
     -1, -1.618,      0
];
var icosahedronPoints = [
      1,      1,      1,
     -1,      1,      1,
      1,     -1,      1,
     -1,     -1,      1,
      1,      1,     -1,
     -1,      1,     -1,
      1,     -1,     -1,
     -1,     -1,     -1,
  1.618,  0.618,      0,
 -1.618,  0.618,      0,
  1.618, -0.618,      0,
 -1.618, -0.618,      0,
  0.618,      0,  1.618,
  0.618,      0, -1.618,
 -0.618,      0,  1.618,
 -0.618,      0, -1.618,
      0,  1.618,  0.618,
      0, -1.618,  0.618,
      0,  1.618, -0.618,
      0, -1.618, -0.618
];

var presets = {
  "Tetrahedron"  : tetrahedronPoints,
  "Cube"         : cubePoints,
  "Octahedron"   : octahedronPoints,
  "Dodecahedron" : dodecahedronPoints,
  "Icosahedron"  : icosahedronPoints
};

var waveFunctions = {
  "Sine"        : x => (Math.sin(2 * Math.PI * x)),
  "SineSquared" : x => (Math.sin(Math.PI * x) * Math.sin(Math.PI * x)),
  "Triangle"    : x => (x < 0.5 ? 2 * x : 2 * (1-x)),
  "Sawtooth"    : x => (x < 0.95 ? x / 0.95 : (1-x) / 0.05),
  "Square"      : x => (1)
};

function FaceGeometry (xDirection, yDirection, zDirection, orientation, resolution) {
  this.vertexList = new Float32Array(3*(resolution+1)*(resolution+2)/2);
  this.triangleIndexList = new Uint32Array(3*resolution*resolution);

  // First, add all the vertices in
  let curVertIdx = 0;
  for (let yIdx = 0; yIdx <= resolution; yIdx++) {
    for (let xIdx = 0; xIdx <= yIdx; xIdx++) {
      let xFloat = xIdx / resolution;
      let yFloat = 1-(yIdx / resolution);
      let zFloat = 1-(xFloat+yFloat);
      let xFloatPosition = xFloat*xDirection;
      let yFloatPosition = yFloat*yDirection;
      let zFloatPosition = zFloat*zDirection;
      let vecLenSq = xFloatPosition*xFloatPosition + yFloatPosition*yFloatPosition + zFloatPosition*zFloatPosition;
      let vecLen = Math.sqrt(vecLenSq);
      this.vertexList[3*curVertIdx+0] = xFloatPosition/vecLen;
      this.vertexList[3*curVertIdx+1] = yFloatPosition/vecLen;
      this.vertexList[3*curVertIdx+2] = zFloatPosition/vecLen;
      curVertIdx++;


    }
  }

  // Then add all of the faces. Note that for all j, we have vertices from (0,j)
  // through (j,j); it looks something like this:
  //   o (0,0)
  //   |\
  //   o-o
  //   |\|\
  //   o-o-o
  //   |\|\|\
  //   o-o-o-o
  // (0,3)   (3,3)
  //
  // for each j, then for each i >=0 and <j we add a face for [ (i,j), (i,j+1), (i+1,j+1) ],
  // and one for [ (i,j), (i+1, j+1), (i+1, j) ]; finally we add the face
  // [ (j, j), (j, j+1), (j+1, j+1) ] at the end of the row.
  // Finally, note that vertex (i,j) is at index i+(j(j+1)/2).
  let curTriIdx = 0;
  for (yIdx = 0; yIdx <= resolution-1; yIdx++) {
    let firstRowBaseIndex = yIdx*(yIdx+1)/2;
    let secondRowBaseIndex = (yIdx+1)*(yIdx+2)/2;
    for (xIdx = 0; xIdx < yIdx; xIdx++) {
      let triIndex0 = xIdx + firstRowBaseIndex;
      let triIndex1 = xIdx + secondRowBaseIndex;
      let triIndex2 = xIdx + 1 + secondRowBaseIndex;
      if (orientation) {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex2;
        this.triangleIndexList[3*curTriIdx+2] = triIndex1;
      } else {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex1;
        this.triangleIndexList[3*curTriIdx+2] = triIndex2;
      }
      curTriIdx++;

      triIndex0 = xIdx + firstRowBaseIndex;
      triIndex1 = xIdx + 1 + secondRowBaseIndex;
      triIndex2 = xIdx + 1 + firstRowBaseIndex;
      if (orientation) {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex2;
        this.triangleIndexList[3*curTriIdx+2] = triIndex1;
      } else {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex1;
        this.triangleIndexList[3*curTriIdx+2] = triIndex2;
      }
      curTriIdx++;
    }
    let triIndex0 = yIdx + firstRowBaseIndex;
    let triIndex1 = yIdx + secondRowBaseIndex;
    let triIndex2 = yIdx + 1 + secondRowBaseIndex;
      if (orientation) {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex2;
        this.triangleIndexList[3*curTriIdx+2] = triIndex1;
      } else {
        this.triangleIndexList[3*curTriIdx+0] = triIndex0;
        this.triangleIndexList[3*curTriIdx+1] = triIndex1;
        this.triangleIndexList[3*curTriIdx+2] = triIndex2;
      }
    curTriIdx++;
  }
}

function MinDistToSource(vertX, vertY, vertZ, sourcePointList) {
  let minDist = Number.MAX_VALUE;
  let sourcePointCount = sourcePointList.length/3;
  for (let sourcePointIdx = 0; sourcePointIdx < sourcePointCount; sourcePointIdx++) {
    let sourcePointX = sourcePointList[3*sourcePointIdx+0];
    let sourcePointY = sourcePointList[3*sourcePointIdx+1];
    let sourcePointZ = sourcePointList[3*sourcePointIdx+2];
    let sourceLen = Math.sqrt(sourcePointX*sourcePointX + sourcePointY*sourcePointY + sourcePointZ*sourcePointZ);
    let normalizedSourceX = sourcePointX / sourceLen;
    let normalizedSourceY = sourcePointY / sourceLen;
    let normalizedSourceZ = sourcePointZ / sourceLen;
    let dist = Math.acos(Math.min(Math.max(-1, vertX*normalizedSourceX + vertY*normalizedSourceY + vertZ*normalizedSourceZ), 1));
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

function SecondMinDistToSource(vertX, vertY, vertZ, sourcePointList) {
  let minDist = Number.MAX_VALUE;
  let secondMinDist = Number.MAX_VALUE;
  let sourcePointCount = sourcePointList.length/3;
  for (let sourcePointIdx = 0; sourcePointIdx < sourcePointCount; sourcePointIdx++) {
    let sourcePointX = sourcePointList[3*sourcePointIdx+0];
    let sourcePointY = sourcePointList[3*sourcePointIdx+1];
    let sourcePointZ = sourcePointList[3*sourcePointIdx+2];
    let sourceLen = Math.sqrt(sourcePointX*sourcePointX + sourcePointY*sourcePointY + sourcePointZ*sourcePointZ);
    let normalizedSourceX = sourcePointX / sourceLen;
    let normalizedSourceY = sourcePointY / sourceLen;
    let normalizedSourceZ = sourcePointZ / sourceLen;
    let dist = Math.acos(Math.min(Math.max(-1, vertX*normalizedSourceX + vertY*normalizedSourceY + vertZ*normalizedSourceZ), 1));
    if (dist < minDist) {
      secondMinDist = minDist;
      minDist = dist;
    } else if (dist < secondMinDist) {
      secondMinDist = dist;
    }
  }
  return secondMinDist;
}

function DistortVertexList (vertexList, sourcePointList, distortionInfo) {
  // First, figure out the maximum (spherical) distance from
  // any point on the sphere to any of the source points.
  let vertexCount = vertexList.length/3;
  let maxMinDist = 0;
  for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
    let vertX = vertexList[3*vertexIdx+0];
    let vertY = vertexList[3*vertexIdx+1];
    let vertZ = vertexList[3*vertexIdx+2];
    let minDist = MinDistToSource(vertX, vertY, vertZ, sourcePointList);
    if (minDist > maxMinDist) maxMinDist = minDist;
  }
  // Now that we have that, we can 'normalize' minimal distances by
  // the maximum minDist.
  for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
    let vertX = vertexList[3*vertexIdx+0];
    let vertY = vertexList[3*vertexIdx+1];
    let vertZ = vertexList[3*vertexIdx+2];
    let minDist = MinDistToSource(vertX, vertY, vertZ, sourcePointList);
    let secondMinDist = SecondMinDistToSource(vertX, vertY, vertZ, sourcePointList);
    let normDist = distortionInfo.waveShapeBlendAlpha * (minDist/maxMinDist) + (1-distortionInfo.waveShapeBlendAlpha) * (minDist/secondMinDist);
    let offsetPos = distortionInfo.frequency*normDist-distortionInfo.offset;
    let periodPos = offsetPos - Math.trunc(offsetPos);
    let waveFuncArgument = Math.max(0.0, Math.min(periodPos / distortionInfo.width, 1.0));
    let displacement = distortionInfo.amplitude * distortionInfo.function(waveFuncArgument);
    // Displace the vertex outward (i.e., away from the origin) by the displacement.
    vertexList[3*vertexIdx+0] = vertX * (1.0+displacement);
    vertexList[3*vertexIdx+1] = vertY * (1.0+displacement);
    vertexList[3*vertexIdx+2] = vertZ * (1.0+displacement);
  }
}

function CombineGeometries (geometryArray) {
  let totalVertexListLength = 0;
  let totalTriangleIndexListLength = 0;
  for (let idx = 0; idx < geometryArray.length; idx++) {
    totalVertexListLength += geometryArray[idx].vertexList.length;
    totalTriangleIndexListLength += geometryArray[idx].triangleIndexList.length;
  }
  let vertexList = new Float32Array(totalVertexListLength);
  let triangleIndexList = new Uint32Array(totalTriangleIndexListLength);
  let baseVertexIdx = 0;
  let baseTriangleIdx = 0;
  for (let idx = 0; idx < geometryArray.length; idx++) {
    let vertexCount = geometryArray[idx].vertexList.length / 3;
    for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
      let curVertexIdx = baseVertexIdx + vertexIdx;
      vertexList[3*curVertexIdx+0] = geometryArray[idx].vertexList[3*vertexIdx+0];
      vertexList[3*curVertexIdx+1] = geometryArray[idx].vertexList[3*vertexIdx+1];
      vertexList[3*curVertexIdx+2] = geometryArray[idx].vertexList[3*vertexIdx+2];
    }
    let triangleCount = geometryArray[idx].triangleIndexList.length / 3;
    for (let triangleIdx = 0; triangleIdx < triangleCount; triangleIdx++) {
      let curTriangleIdx = baseTriangleIdx + triangleIdx;
      // Note that since this is a list of indices, we can't just copy over - we have to offset by the
      // position of the corresponding vertices in the vertex list.
      triangleIndexList[3*curTriangleIdx+0] = geometryArray[idx].triangleIndexList[3*triangleIdx+0]+baseVertexIdx;
      triangleIndexList[3*curTriangleIdx+1] = geometryArray[idx].triangleIndexList[3*triangleIdx+1]+baseVertexIdx;
      triangleIndexList[3*curTriangleIdx+2] = geometryArray[idx].triangleIndexList[3*triangleIdx+2]+baseVertexIdx;
    }
    baseVertexIdx += vertexCount;
    baseTriangleIdx += triangleCount;
  }
  return {vertexList, triangleIndexList};
}

function Octahedron () {
  // faceArray holds the eight 'faces' of the octahedron; each of them will be independently filled in.
  this.faceArray = [];
  let i=0;
  for (let faceIdx = 0; faceIdx < 8; faceIdx++) {
    let faceXDirection = 2*(faceIdx&1)-1;
    let faceYDirection = 2*((faceIdx&2)>>1)-1;
    let faceZDirection = 2*((faceIdx&4)>>2)-1;
    let faceOrientationSum = faceXDirection + faceYDirection + faceZDirection;
    if ((faceOrientationSum == -3) || (faceOrientationSum == 1)) {
      this.faceArray.push(new FaceGeometry(faceXDirection, faceYDirection, faceZDirection, true, tilingRes))
    } else {
      // We flip the X and Y directions to add an 'extra' sign change
      this.faceArray.push(new FaceGeometry(faceYDirection, faceXDirection, faceZDirection, false, tilingRes))
    }
  }
}


function generateGeometry (sourcePointList, distortionInfo) {
  // Create the octahedron-sphere
  var octahedronLocal = new Octahedron();
  // And combine the geometries into a single vertex and index list.
  var {vertexList, triangleIndexList} = CombineGeometries(octahedronLocal.faceArray);
  // tweak its vertices
  DistortVertexList(vertexList, sourcePointList, distortionInfo);

  var octahedronGeometry = new THREE.BufferGeometry();
  octahedronGeometry.addAttribute('position', new THREE.BufferAttribute(vertexList, 3));
  octahedronGeometry.setIndex( new THREE.BufferAttribute(triangleIndexList, 1));
  octahedronGeometry.computeVertexNormals();

  return octahedronGeometry;
}

function initializeWebGL () {
  console.log("Init container size: " + containerElement.clientWidth + "x" + containerElement.clientHeight);
  camera = new THREE.PerspectiveCamera( 50, containerElement.clientWidth / containerElement.clientHeight, 1, 10 );
  camera.position.z = 8.0;
  camera.aspect = containerElement.clientWidth/containerElement.clientHeight;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer();

  scene = new THREE.Scene();

  // Add some gentle ambient light to the scene...
  let ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);
  // ...and a directional light
  directionalLight = new THREE.DirectionalLight();
  // directionalLight.position.set( 10.0*Math.cos(lightAngle), 0.0, 10.0*Math.sin(lightAngle) );
  directionalLight.position.set( 5.0, 0, 8.5);
  scene.add(directionalLight);

  renderer.setClearColor( 0x101010 );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( containerElement.clientWidth, containerElement.clientHeight );
  containerElement.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );
}

function updateSceneMeshFromGeometry (geom) {
  // Use a basic Lambert (Phong-shaded) material for lighting
  var material = new THREE.MeshLambertMaterial( {color: 0xc0c0ff} );

  // Build a (three.js) mesh from the vertices and add it to the scene
  octahedronMesh = new THREE.Mesh(geom, material);
  octahedronMesh.name = "sphereMesh";
  let oldObject = scene.getObjectByName("sphereMesh");
  if (oldObject) {
    octahedronMesh.rotation.y = oldObject.rotation.y;
  }
  scene.remove(oldObject);
  scene.add(octahedronMesh);
}

function onRemoveButtonClicked (node, listElement) {
  // remove the particular li element in the list that correspond to this row from the list of points
  let listElementNodes = listElement.getElementsByClassName("point");;
  listElement.removeChild(node);
}

function onAppendButtonClicked (listElement) {
  // add a new row of input nodes with values 0, 0, 0
  // the index of this row is equal to the number of li elements of class 'point'
  // currently in the UL element
  let rowIdx = listElement.getElementsByClassName("point").length;
  let listElementNode = document.createElement("li");
  listElementNode.className = "point";
  for (let coordIdx = 0; coordIdx < 3; coordIdx++) {
    let inputNode = document.createElement("input");
    inputNode.setAttribute("type", "text");
    inputNode.setAttribute("value", 0);
    listElementNode.appendChild(inputNode);
  }
  let buttonNode = document.createElement("button");
  buttonNode.setAttribute("type", "button");
  buttonNode.innerHTML = "X";
  buttonNode.addEventListener('click', onRemoveButtonClicked.bind(null, listElementNode, listElement));
  listElementNode.appendChild(buttonNode);
  // now put it in the list at the appropriate spot
  let appendNodes = listElement.getElementsByClassName("appendButton");
  if (appendNodes.length == 0) {
    listElement.append(listElementNode);
  } else {
    listElement.insertBefore(listElementNode, appendNodes[0]);
  }
}

function updateHTMLFromPointList (sourcePointList) {
  pointsListElement = document.getElementById("points");
  // Clear out all the elements from the list of points
  while (pointsListElement.lastChild) {
    pointsListElement.removeChild(pointsListElement.lastChild);
  }
  // Now insert all of the elements in the source point list to the HTMl
  let sourcePointCount = sourcePointList.length / 3;
  for (let sourcePointIdx = 0; sourcePointIdx < sourcePointCount; sourcePointIdx++) {
    let listElementNode = document.createElement("li");
    listElementNode.className = "point";
    // add the three coordinates as input elements
    for (let coordIdx = 0; coordIdx < 3; coordIdx++) {
      let inputNode = document.createElement("input");
      inputNode.setAttribute("type", "text");
      inputNode.setAttribute("value", sourcePointList[3*sourcePointIdx+coordIdx]);
      listElementNode.appendChild(inputNode);
    }
    // And add the delete button for this row as a button
    let buttonNode = document.createElement("button");
    buttonNode.setAttribute("type", "button");
    buttonNode.innerHTML = "X";
    buttonNode.addEventListener('click', onRemoveButtonClicked.bind(null, listElementNode, pointsListElement));
    listElementNode.appendChild(buttonNode);
    pointsListElement.appendChild(listElementNode);
  }
  // And finally add another button that will append another row.
  let appendListElementNode = document.createElement("li");
  appendListElementNode.className = "appendButton";
  let appendButtonNode = document.createElement("button");
  appendButtonNode.setAttribute("type", "button");
  appendButtonNode.innerHTML = "+";
  appendButtonNode.addEventListener('click', onAppendButtonClicked.bind(null, pointsListElement));
  appendListElementNode.appendChild(appendButtonNode);
  pointsListElement.appendChild(appendListElementNode);
}

function updateSphereFromHTMLData () {
  let sourcePointList = [];
  let pointsListElement = document.getElementById("points");
  // Walk through all the children of this
  let listElementNodes = pointsListElement.getElementsByClassName("point");;
  for (let sourcePointIdx = 0; sourcePointIdx < listElementNodes.length; sourcePointIdx++) {
    let curListNode = listElementNodes[sourcePointIdx];
    for (coordIdx = 0; coordIdx < 3; coordIdx++) {
      let inputNode = curListNode.children[coordIdx];
      let val = parseFloat(inputNode.value);
      sourcePointList.push(val);
    }
  }
  let distortionInfo = {
    frequency : parseFloat(document.getElementById("frequency").value),
    amplitude : .01*parseFloat(document.getElementById("amplitudePercent").value),
    waveShapeBlendAlpha : parseFloat(document.getElementById("wavefrontShapeAlpha").value),
    function  : waveFunctions[document.getElementById("waves").value],
    width     : parseFloat(document.getElementById("waveShapeWidth").value),
    offset    : parseFloat(document.getElementById("waveShapeOffset").value)
  };
  // let distortionFunction = x => Math.cos(x);
  let octahedronGeom = generateGeometry(sourcePointList, distortionInfo);
  updateSceneMeshFromGeometry(octahedronGeom);
}

function initializePresets () {
  let presetListElement = document.getElementById("presets");
  while (presetListElement.firstChild) {
    presetListElement.removeChild(presetListElement.firstChild);
  }
  for (let presetItem in presets) {
    let presetButtonNode = document.createElement("button");
    presetButtonNode.setAttribute("type", "button");
    presetButtonNode.innerHTML = presetItem;
    presetButtonNode.addEventListener("click",
      ((ptList) => {
        updateHTMLFromPointList(ptList);
        updateSphereFromHTMLData();
      }).bind(null, presets[presetItem])
    );
    presetListElement.appendChild(presetButtonNode);
  }
}

function initializeWaveFunctions () {
  let waveFunctionSelectElement = document.getElementById("waves");
  while (waveFunctionSelectElement.firstChild) {
    waveFunctionSelectElement.removeChild(waveFunctionSelectElement.firstChild);
  }
  for (let waveFunctionItem in waveFunctions) {
    let waveFunctionOptionNode = document.createElement("option");
    waveFunctionOptionNode.setAttribute("value", waveFunctionItem);
    waveFunctionOptionNode.innerHTML = waveFunctionItem;
    waveFunctionSelectElement.appendChild(waveFunctionOptionNode);
  }
}

function initialize () {
  initializeWebGL();
  initializePresets();
  initializeWaveFunctions();
  selectTetrahedron();
}

function selectTetrahedron () {
  updateHTMLFromPointList(tetrahedronPoints);
  updateSphereFromHTMLData();
}

function selectCube () {
  updateHTMLFromPointList(cubePoints);
  updateSphereFromHTMLData();
}

function selectOctahedron () {
  updateHTMLFromPointList(octahedronPoints);
  updateSphereFromHTMLData();
}

function selectDodecahedron () {
  updateHTMLFromPointList(dodecahedronPoints);
  updateSphereFromHTMLData();
}

function selecticosahedron () {
  updateHTMLFromPointList(icosahedronPoints);
  updateSphereFromHTMLData();
}

function animate () {
  requestAnimationFrame(animate);
  render();
}

function render () {
  octahedronMesh.rotation.y += .005;
  lightAngle -= .010;
  // directionalLight.position.set( 10.0*Math.cos(lightAngle), 0.0, 10.0*Math.sin(lightAngle) );
  renderer.render(scene,camera);
}

function onWindowResize (event) {
  console.log("Resizing container: " + containerElement.clientWidth + "x" + containerElement.clientHeight);
  camera.aspect = containerElement.clientWidth/containerElement.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
}

