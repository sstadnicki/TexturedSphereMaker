// tilingRes is the resolution the triangles of the sphere are diced into; it's the number of points along each side
// of each triangle in the octahedron we start by tiling the sphere as...
var tilingRes = 100;

// distortionStrength is the magnitude of the distortion.
// distortionFreq is the number of bands of distortion between points
var distortionStrength = 0.02;
var distortionFreq = 5;

var lightAngle = 0;

var directionalLight;

// sourcePointList is an array of points - the sphere's surface will be modulated
// by a function of the distance of each point on the sphere to the closest
// of these points.
var sourcePointList = [
  1,  1,  1,
 -1,  1,  1,
  1, -1,  1,
 -1, -1,  1,
  1,  1, -1,
 -1,  1, -1,
  1, -1, -1,
 -1, -1, -1
];

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

function MinDistToSource(vertX, vertY, vertZ) {
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

function DistortVertexList (vertexList) {
  // First, figure out the maximum (spherical) distance from
  // any point on the sphere to any of the source points.
  let vertexCount = vertexList.length/3;
  let maxMinDist = 0;
  for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
    let vertX = vertexList[3*vertexIdx+0];
    let vertY = vertexList[3*vertexIdx+1];
    let vertZ = vertexList[3*vertexIdx+2];
    let minDist = MinDistToSource(vertX, vertY, vertZ);
    if (minDist > maxMinDist) maxMinDist = minDist;
  }
  // Now that we have that, we can 'normalize' minimal distances by
  // the maximum minDist.
  let distortionMultiplier = 2 * Math.PI * distortionFreq;
  for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
    let vertX = vertexList[3*vertexIdx+0];
    let vertY = vertexList[3*vertexIdx+1];
    let vertZ = vertexList[3*vertexIdx+2];
    let minDist = MinDistToSource(vertX, vertY, vertZ);
    let normDist = minDist / maxMinDist;
    let displacement = distortionStrength * Math.cos(distortionMultiplier * normDist);
    // Displace the vertex outward (i.e., away from the origin) by the displacement.
    vertexList[3*vertexIdx+0] = vertX * (1.0+displacement);
    vertexList[3*vertexIdx+1] = vertY * (1.0+displacement);
    vertexList[3*vertexIdx+2] = vertZ * (1.0+displacement);
  }
}

function DistortGeometryVertices (geometryArray) {
  // First, figure out what the maximum (spherical) distance from
  // any point on the sphere to any of the soure points.
  for (let idx = 0; idx < geometryArray.length; idx++) {
    DistortVertexList(geometryArray[idx].vertexList);
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

function initialize () {
  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 10 );
  camera.position.z = 8.0;

  renderer = new THREE.WebGLRenderer();

  scene = new THREE.Scene();

  // Create the octahedron-sphere
  var octahedronLocal = new Octahedron();
  // tweak its vertices
  DistortGeometryVertices(octahedronLocal.faceArray);
  // And combine the geometries into a single vertex and index list.
  var {vertexList, triangleIndexList} = CombineGeometries(octahedronLocal.faceArray);

  var octahedronGeometry = new THREE.BufferGeometry();
  octahedronGeometry.addAttribute('position', new THREE.BufferAttribute(vertexList, 3));
  octahedronGeometry.setIndex( new THREE.BufferAttribute(triangleIndexList, 1));
  octahedronGeometry.computeVertexNormals();

  // Use a basic Lambert (Phong-shaded) material for lighting
  var material = new THREE.MeshLambertMaterial( {color: 0xc0c0ff} );

  // Build a (three.js) mesh from the vertices and add it to the scene
  octahedronMesh = new THREE.Mesh(octahedronGeometry, material);
  scene.add(octahedronMesh);

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
  renderer.setSize( window.innerWidth, window.innerHeight );
  containerElement.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );
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
  camera.aspect = containerElement.clientWidth/containerElement.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
}

