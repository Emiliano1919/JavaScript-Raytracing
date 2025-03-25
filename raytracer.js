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