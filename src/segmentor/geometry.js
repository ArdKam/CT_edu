(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTEduSegmentorGeometry = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  function matrixFrom(value) {
    if (!value) return null;
    const m = { a:Number(value.a), b:Number(value.b), c:Number(value.c), d:Number(value.d), e:Number(value.e), f:Number(value.f) };
    return Object.values(m).every(Number.isFinite) ? m : null;
  }
  function transformPoint(point, value) {
    const m = matrixFrom(value);
    if (!m || !point || !finite(point.x) || !finite(point.y)) return null;
    return { x:m.a*point.x + m.c*point.y + m.e, y:m.b*point.x + m.d*point.y + m.f };
  }
  function invertMatrix(value) {
    const m = matrixFrom(value);
    if (!m) return null;
    const determinant = m.a*m.d - m.b*m.c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
    return {
      a:m.d/determinant, b:-m.b/determinant, c:-m.c/determinant, d:m.a/determinant,
      e:(m.c*m.f - m.d*m.e)/determinant, f:(m.b*m.e - m.a*m.f)/determinant
    };
  }
  function clientToNative(clientX, clientY, screenMatrix) {
    if (!finite(clientX) || !finite(clientY)) return null;
    return transformPoint({x:clientX,y:clientY}, invertMatrix(screenMatrix));
  }
  function insideRegion(point, region, epsilon) {
    const tol = finite(epsilon) ? epsilon : 1e-6;
    return !!point && !!region && finite(point.x) && finite(point.y) &&
      finite(region.x) && finite(region.y) && finite(region.width) && finite(region.height) &&
      region.width > 0 && region.height > 0 &&
      point.x >= region.x - tol && point.y >= region.y - tol &&
      point.x <= region.x + region.width + tol && point.y <= region.y + region.height + tol;
  }
  function signedArea(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let area = 0;
    for (let i=0, j=points.length-1; i<points.length; j=i++) area += points[j].x*points[i].y-points[i].x*points[j].y;
    return area/2;
  }
  function orientation(a,b,c) {
    const value=(b.y-a.y)*(c.x-b.x)-(b.x-a.x)*(c.y-b.y);
    return Math.abs(value) < 1e-9 ? 0 : value > 0 ? 1 : 2;
  }
  function onSegment(a,b,c) {
    return b.x <= Math.max(a.x,c.x)+1e-9 && b.x+1e-9 >= Math.min(a.x,c.x) &&
      b.y <= Math.max(a.y,c.y)+1e-9 && b.y+1e-9 >= Math.min(a.y,c.y);
  }
  function segmentsIntersect(p1,q1,p2,q2) {
    const o1=orientation(p1,q1,p2), o2=orientation(p1,q1,q2), o3=orientation(p2,q2,p1), o4=orientation(p2,q2,q1);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1===0 && onSegment(p1,p2,q1)) return true;
    if (o2===0 && onSegment(p1,q2,q1)) return true;
    if (o3===0 && onSegment(p2,p1,q2)) return true;
    if (o4===0 && onSegment(p2,q1,q2)) return true;
    return false;
  }
  function validatePolygon(points, region, options) {
    const maxVertices = options && Number.isInteger(options.maxVertices) ? options.maxVertices : 10000;
    if (!Array.isArray(points) || points.length < 3) return {valid:false,error:'too-few-vertices'};
    if (points.length > maxVertices) return {valid:false,error:'too-many-vertices'};
    if (!points.every(p => p && finite(p.x) && finite(p.y))) return {valid:false,error:'non-finite-coordinate'};
    if (region && !points.every(p => insideRegion(p,region,0))) return {valid:false,error:'out-of-region'};
    if (new Set(points.map(p => p.x.toFixed(6)+','+p.y.toFixed(6))).size < 3) return {valid:false,error:'duplicate-vertices'};
    if (Math.abs(signedArea(points)) < 1) return {valid:false,error:'degenerate-area'};
    const n=points.length;
    for (let i=0;i<n;i++) {
      const a=points[i], b=points[(i+1)%n];
      if (Math.hypot(a.x-b.x,a.y-b.y) < 1e-6) return {valid:false,error:'zero-length-edge'};
      for (let j=i+1;j<n;j++) {
        if (j===i || j===(i+1)%n || (j+1)%n===i) continue;
        if (i===0 && j===n-1) continue;
        if (segmentsIntersect(a,b,points[j],points[(j+1)%n])) return {valid:false,error:'self-intersection'};
      }
    }
    return {valid:true,error:null,area:Math.abs(signedArea(points))};
  }
  function clonePoints(points) { return points.map(p => ({x:Number(p.x),y:Number(p.y)})); }
  return Object.freeze({matrixFrom,transformPoint,invertMatrix,clientToNative,insideRegion,signedArea,segmentsIntersect,validatePolygon,clonePoints});
}));