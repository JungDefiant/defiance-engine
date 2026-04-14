import {
	Mesh,
	VertexBuffer,
	VertexData,
	FloatArray,
} from "@babylonjs/core";

export function clamp(val: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, val));
}

export function minimizeVertices(mesh: Mesh) {
	var _pdata = mesh.getVerticesData(VertexBuffer.PositionKind)!;
	var _ndata = mesh.getVerticesData(VertexBuffer.NormalKind);
	var _idata = mesh.getIndices()!;

	var _newPdata = []; //new positions array
	var _newIdata = []; //new indices array

	var _mapPtr = 0; // new index;
	var _uniquePositions = []; // unique vertex positions
	for (var _i = 0; _i < _idata.length; _i += 3) {
		var _facet = [_idata[_i], _idata[_i + 1], _idata[_i + 2]]; //facet vertex indices
		var _pstring = []; //lists facet vertex positions (x,y,z) as string "xyz""
		for (var _j = 0; _j < 3; _j++) {
			//
			_pstring[_j] = "";
			for (var _k = 0; _k < 3; _k++) {
				//small values make 0
				if (Math.abs(_pdata[3 * _facet[_j] + _k]) < 0.0001) {
					_pdata[3 * _facet[_j] + _k] = 0;
				}
				_pstring[_j] += _pdata[3 * _facet[_j] + _k] + "|";
			}
			_pstring[_j] = _pstring[_j].slice(0, -1);
		}
		//check facet vertices to see that none are repeated
		// do not process any facet that has a repeated vertex, ie is a line
		if (
			!(
				_pstring[0] == _pstring[1] ||
				_pstring[0] == _pstring[2] ||
				_pstring[1] == _pstring[2]
			)
		) {
			//for each facet position check if already listed in uniquePositions
			// if not listed add to uniquePositions and set index pointer
			// if listed use its index in uniquePositions and new index pointer
			for (var _j = 0; _j < 3; _j++) {
				var _ptr = _uniquePositions.indexOf(_pstring[_j]);
				if (_ptr < 0) {
					_uniquePositions.push(_pstring[_j]);
					_ptr = _mapPtr++;
					//not listed so add individual x, y, z coordinates to new positions array newPdata
					//and add matching normal data to new normals array newNdata
					for (var _k = 0; _k < 3; _k++) {
						_newPdata.push(_pdata[3 * _facet[_j] + _k]);
					}
				}
				// add new index pointer to new indices array newIdata
				_newIdata.push(_ptr);
			}
		}
	}

	const _newNdata: FloatArray = []; //new normal data

	VertexData.ComputeNormals(_newPdata, _newIdata, _newNdata);

	//create new vertex data object and update
	var _vertexData = new VertexData();
	_vertexData.positions = _newPdata;
	_vertexData.indices = _newIdata;
	_vertexData.normals = _newNdata;

	_vertexData.applyToMesh(mesh);
}
