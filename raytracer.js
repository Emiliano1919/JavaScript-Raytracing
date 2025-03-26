const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 600;
canvas.height = 600;
const canvas_ctx = canvas.getContext("2d");
let canvas_buffer = canvas_ctx.getImageData(0, 0, canvas.width, canvas.height);

class Color{
    constructor(r,g,b){
        this.r=r;
        this.g=g;
        this.b=b;
    }

    modifyIntensity(k){
        this.r=k*r;
        this.g=k*g;
        this.b=k.b;
    }

    #evaluateAddition(a,b){
        if(a+b>=255){
            return 255;
        }
        if(a+b<=0){
            return 0;
        }
    }

    add(other) {

        return new Color(
          this.#evaluateAddition(this.r,other.r),
          this.#evaluateAddition(this.g,other.g),
          this.#evaluateAddition(this.b,other.b)
        );
    }
}

function putPixel(x, y, color) {
    const sx=canvas.width/2+x
    const sy=canvas.height/2-y
    if (sx<-canvas.width/2  || sx>canvas.width/2 - 1 || sy<-canvas.height/2 || sy > canvas.height/2-1){
        return null;
    }
    const index = (sy * canvas.width + sx) * 4;
    data[index] = color.r;
    data[index + 1] = color.g; 
    data[index + 2] = color.b;
    data[index + 3] = 255;
    
}