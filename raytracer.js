const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 600;
canvas.height = 600;
const canvas_ctx = canvas.getContext("2d");
let canvas_buffer = canvas_ctx.getImageData(0, 0, canvas.width, canvas.height);
let data = canvas_buffer.data;

const inf = 10000;
const viewport_width = 1;
const viewport_height = 1;
const projection_plane_z = 1;


class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    modifyIntensity(k) {
        return new Color(
            Math.min(Math.round(k * this.r), 255),
            Math.min(Math.round(k * this.g), 255),
            Math.min(Math.round(k * this.b), 255)
        );
    }

    #evaluateAddition(a, b) {
        if (a + b >= 255) return 255;
        if (a + b <= 0) return 0;
        return a + b;
    }
    add(other) {
        return new Color(
          this.#evaluateAddition(this.r,other.r),
          this.#evaluateAddition(this.g,other.g),
          this.#evaluateAddition(this.b,other.b)
        );
    }
    
}

class Light {
    constructor(type, intensity, position=null, direction=null) {
        this.type=type;
        this.intensity=intensity;
        this.position=position;
        this.direction=direction;
    }
}

const BACKGROUND_COLOR = new Color(0, 0, 0);

class Sphere {
    constructor(centre, radius, color, specular,reflective, refraction, isRefractive) {
        this.centre = centre;
        this.radius = radius;
        this.color = color;
        this.specular = specular;
        this.reflective=reflective;
        this.refraction = refraction; // When 0 we will take it as non transparent material (skip refraction)
        this.isRefractive = isRefractive;
    }
}

class Vector {
    constructor(x, y, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    normalize() {
        let mag = this.magnitude();
        return mag === 0 ? new Vector(0, 0, 0) : new Vector(this.x / mag, this.y / mag, this.z / mag);
    }

    scale(scalar) {
        return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
    }
}

class Plane {
    constructor(point, normal, color1, color2, specular = 0, reflective = 0.3, refraction, isRefractive) {
        this.point = point;
        this.normal = normal.normalize();
        this.color1 = color1; // We are assuming the checker pattern
        this.color2 = color2;
        this.specular = specular;
        this.reflective = reflective;
        this.refraction = refraction;
        this.isRefractive = isRefractive;
    }

    // Ray-plane intersection
    intersect(O, D) {
        const denominator = this.normal.dot(D);
        if (Math.abs(denominator) < 1e-6) return null; // Ray is parallel

        const t = this.point.subtract(O).dot(this.normal) / denominator;
        return t >= 0 ? t : null;
    }

    // Get checkered color at a given point on the plane
    getColorAt(point) {
        const scale = 1.0; // tweak this to scale the checks
        const x = Math.floor(point.x * scale);
        const z = Math.floor(point.z * scale);
        return (x + z) % 2 === 0 ? this.color1 : this.color2;
    }
}

class Matrix3x3 {
    constructor(rows) {
        this.rows = rows; 
        //Expects an array of 3 arrays, each with 3 numbers
    }

    multiplyVector(v) {
        let x = this.rows[0][0] * v.x + this.rows[0][1] * v.y + this.rows[0][2] * v.z;
        let y = this.rows[1][0] * v.x + this.rows[1][1] * v.y + this.rows[1][2] * v.z;
        let z = this.rows[2][0] * v.x + this.rows[2][1] * v.y + this.rows[2][2] * v.z;
        return new Vector(x, y, z);
    }
}

function canvasToViewport(x, y) {
    return new Vector(x * (viewport_width / canvas.width), y * (viewport_height / canvas.height), 1);
}

function putPixel(x, y, color) {
    const sx = canvas.width / 2 + x;
    const sy = canvas.height / 2 - y;
    
    if (sx < 0 || sx >= canvas.width || sy < 0 || sy >= canvas.height) {
        return;
    }
    
    const index = (Math.floor(sy) * canvas.width + Math.floor(sx)) * 4;
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
}

// The Scene
const camera_position = new Vector(0, 0, 0);
const spheres = [
    new Sphere(new Vector(0, -1, 3), 1, new Color(255, 0, 0),500,0.2,0,false),
    new Sphere(new Vector(-2, 0, 4), 1, new Color(0, 255, 0),80,0.3,0,false),
    new Sphere(new Vector(0, 0, -2), 1, new Color(0, 0, 255),10,0.4,1.5,true), // refraction of glass
    new Sphere(new Vector(0, -5001, 0), 5000, new Color(255, 0, 255),100,0.5,0,false)
];

const planes = [
    new Plane(new Vector(0, -1, 0), new Vector(0, 1, 0),
              new Color(255, 255, 255), new Color(0, 200, 200), 10, 0.1,0,false)
];

const lights= [
    new Light('ambient', 0.2),
    new Light('point', 0.6, new Vector(2, 1, 0)),
    new Light('directional', 0.2,null,new Vector(2, 1, 0))
];

function rotationMatrix(xdegrees,ydegrees,zdegrees, v) {
    let actual_x=(xdegrees * (Math.PI / 180));
    let actual_y=(ydegrees * (Math.PI / 180));
    let actual_z=(zdegrees * (Math.PI / 180));
    let cos_x=Math.cos(actual_x)
    let sin_x=Math.sin(actual_x)
    let cos_y=Math.cos(actual_y)
    let sin_y=Math.sin(actual_y)
    let cos_z=Math.cos(actual_z)
    let sin_z=Math.sin(actual_z)
    const xRmatrix = new Matrix3x3([
        [1, 0, 0],
        [0, cos_x, -1 * sin_x],
        [0, sin_x, cos_x]
    ]);
    const yRmatrix = new Matrix3x3([
        [cos_y, 0, sin_y],
        [0, 1, 0],
        [-1 * sin_y, 0, cos_y]
    ]);
    const zRmatrix = new Matrix3x3([
        [cos_z, -1 * sin_z, 0],
        [sin_z, cos_z, 0],
        [0, 0, 1]
    ]);
    updated_z = zRmatrix.multiplyVector(v);
    updated_zy = yRmatrix.multiplyVector(updated_z);
    updated_zyx = xRmatrix.multiplyVector(updated_zy);
    return updated_zyx;
}



const O = new Vector(-2, 0, -10);

for (let x = -canvas.width / 2; x <= canvas.width / 2; x++) {
    for (let y = -canvas.height / 2; y <= canvas.height / 2; y++) {
        let D = rotationMatrix(0,0,0, canvasToViewport(x, y));
        let color = traceRay(O, D, 1, inf, 3,1);
        putPixel(x, y, color);
    }
}

canvas_ctx.putImageData(canvas_buffer, 0, 0);

function closestIntersection(O, D, t_min, t_max) {
    let closest_t = inf;
    let closest_obj = null;
    let is_plane = false;

    for (let sphere of spheres) {
        let [t1, t2] = intersectRaySphere(O, D, sphere);

        if (t1 >= t_min && t1 < closest_t) {
            closest_t = t1;
            closest_obj = sphere;
        }
        if (t2 >= t_min && t2 < closest_t) {
            closest_t = t2;
            closest_obj = sphere;
        }
    }

    for (let plane of planes) {
        const t = plane.intersect(O, D);
        if (t != null && t_min < t && t < closest_t) {
            closest_t = t;
            closest_obj = plane;
            is_plane = true;
        }
    }

    return [closest_obj, closest_t, is_plane];
}


function reflectRay(R, N,NdotR){
    return N.scale(2 * NdotR).subtract(R);
}

function computeLighting(P,N,V, s) {
    let i=0.0;
    let t_max;
    for (let light of lights){
        if (light.type == 'ambient'){
            i+=light.intensity;
        }  
        else {
            let L;
            if(light.type == 'point'){
                L=light.position.subtract(P);
                t_max=1;
            }
            else if(light.type == 'directional'){
                L=light.direction;
                t_max=inf; //P+tL=P+L=THE LIGHT POINT
            }
            let [shadow_sphere,shadow_t]=closestIntersection(P,L,0.001,t_max)

            if (shadow_sphere != null) {
                continue;
            }
            const NdotL=N.dot(L);
            if (NdotL>0){
                i+=light.intensity*(NdotL/(L.magnitude()*N.magnitude()));
            }
            if (s != -1){
                let R = reflectRay(L,N,NdotL);
                const RdotV=R.dot(V);
                if (RdotV>0) {
                    i+=light.intensity*((RdotV/(R.magnitude()*V.magnitude()))**s)
                }
            }
            
        }
    }
    return i;
}



function traceRay(O, D, t_min, t_max , recursion_depth, current_refraction) {
    let [obj, closest_t, is_plane] = closestIntersection(O, D, t_min, t_max);
    if (obj == null) {
        return BACKGROUND_COLOR;
    }
    let P = O.add(D.scale(closest_t)); //P=O+t(V-O)=O+tD
    let N = is_plane ? obj.normal : P.subtract(obj.centre).normalize();
    
    const color = is_plane ? obj.getColorAt(P) : obj.color;
    const local_color = color.modifyIntensity(
        computeLighting(P, N, D.scale(-1), obj.specular)
    );

    let r=obj.reflective;
    if ( r<=0 || recursion_depth <= 0 ) {
        return local_color;
    }
    let mD=D.scale(-1);
    let NdotmD = N.dot(mD);
    let R=reflectRay(mD,N, NdotmD);
    let reflected_color = traceRay(P,R,0.001,inf,recursion_depth-1,current_refraction);
    let refracted_color = BACKGROUND_COLOR;
    if (obj.isRefractive == true ) {
        let n1, n2;
        let cosAlpha_i= N.dot(D);
        if (N.dot(D) > 0) {
            N = N.scale(-1);  // Flip the normal if we are exiting
            [n1, n2] = [obj.refraction, 1.0];  // Going out to  air
        } else {
            cosAlpha_i = -1 *( N.dot(D)); 
            [n1, n2] = [current_refraction, obj.refraction];
        }

        
        const sinAlpha_i_p2 = (1 - (cosAlpha_i * cosAlpha_i)); 

        const sinAlpha_t = ((n1 / n2) *(n1/n2)) * sinAlpha_i_p2;

        if (sinAlpha_t > 1) {
            refracted_color = new Color(0,0,0);  // Cannot refract so do not contribute color (sin over 1 is not possible)
        } else {
            const cosAlpha_t = Math.sqrt(1 - sinAlpha_t * sinAlpha_t);
            const refractedDirection = D.scale(n1 / n2).add(
                N.scale((n1 / n2) * cosAlpha_i - cosAlpha_t)
            ).normalize();
            refracted_color = traceRay(P, refractedDirection, 0.001, inf, recursion_depth - 1, n2);
        }
        let localContribution = local_color.modifyIntensity(1 - r );
        let reflectionContribution = reflected_color.modifyIntensity(r);
        let refractionContribution = refracted_color.modifyIntensity(r);
        return localContribution.add(reflectionContribution).add(refractionContribution);
    }
    return local_color.modifyIntensity(1 - r).add(reflected_color.modifyIntensity(r));
}
    

function intersectRaySphere(O, D, sphere) {
    let CO = O.subtract(sphere.centre);
    let a = D.dot(D);
    let b = 2 * CO.dot(D);
    let c = CO.dot(CO) - sphere.radius * sphere.radius;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return [inf, inf];
    }

    let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return [t1, t2];
}
