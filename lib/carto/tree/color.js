var chroma = require('chroma-js'),
    husl = require('husl'),
    _ = require('lodash');

(function(tree) {

tree.Color = function Color(hsl, a, perceptual) {
    if (Array.isArray(hsl)) {
        this.hsl = hsl.slice(0, 3);
        this.hsl[0] = Math.max(0, Math.min(this.hsl[0], 360));
        this.hsl[1] = Math.max(0, Math.min(this.hsl[1], 1));
        this.hsl[2] = Math.max(0, Math.min(this.hsl[2], 1));
    } else {
        this.hsl = null;
    }

    if (typeof(a) === 'number') {
        this.alpha = a;
    } else {
        this.alpha = 1;
    }
    if (typeof(a) === 'number') {
        this.alpha = a;
    } else {
        this.alpha = 1;
    }
    if (typeof(perceptual) == 'boolean') {
        this.perceptual = perceptual;
    } else {
        this.perceptual = false;
    }
};

tree.Color.prototype = {
    is: 'color',
    'ev': function() { return this; },

    // If we have some transparency, the only way to represent it
    // is via `rgba`. Otherwise, we use the hex representation,
    // which has better compatibility with older browsers.
    toString: function() {
        if (this.hsl !== null) {
            if (this.alpha < 1.0) {
                if (this.perceptual) {
                    return 'rgba(' + husl.toRGB(this.hsl[0], this.hsl[1] * 100, this.hsl[2] * 100).map(function(c) {
                        return Math.round(c * 255);
                    }).concat(this.round(this.alpha, 2)).join(', ') + ')';
                }
                else {
                    return 'rgba(' + chroma.hsl(this.hsl[0], this.hsl[1], this.hsl[2]).rgb().map(function(c) {
                        return Math.round(c);
                    }).concat(this.round(this.alpha, 2)).join(', ') + ')';
                }
            } else {
                if (this.perceptual) {
                    return husl.toHex(this.hsl[0], this.hsl[1] * 100, this.hsl[2] * 100);
                }
                else {
                    return chroma.hsl(this.hsl[0], this.hsl[1], this.hsl[2]).hex();
                }
            }
        }
        return '';
    },

    isPerceptual: function() {
        return this.perceptual;
    },

    toPerceptual: function() {
        if (this.perceptual) {
            return this;
        }
        else {
            // transition via RGB, because HSL values cannot be directly
            // transformed into HUSL values easily
            var rgb = chroma.hsl(this.hsl[0], this.hsl[1], this.hsl[2]).rgb();
            var huslc = husl.fromRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
            return new tree.Color([huslc[0], huslc[1] / 100, huslc[2] / 100], this.alpha, true);
        }
    },

    toStandard: function() {
        if (!this.perceptual) {
            return this;
        }
        else {
            // transition via RGB, because HUSL values cannot be directly
            // transformed into HSL values easily
            var rgb = husl.toRGB(this.hsl[0], this.hsl[1], this.hsl[2]).rgb();
            var hsl = chroma(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255).hsl();
            return new tree.Color([hsl[0], hsl[1], hsl[2]], this.alpha, false);
        }
    },

    // Operations have to be done in RGB per-channel, if not,
    // channels will spill onto each other. Once we have
    // our result, in the form of an integer triplet,
    // we create a new Color node to hold the result.
    operate: function(env, op, other) {
        var result = [];

        if (! (other instanceof tree.Color)) {
            other = other.toColor();
        }

        var normalize = function (x) {
            return x / 255;
        };
        var denormalize = function (x) {
            return x * 255;
        };

        var rgb1 = _.map(chroma(this.toString()).rgb(), normalize);
        var rgb2 = _.map(chroma(other.toString()).rgb(), normalize);

        for (var c = 0; c < 3; c++) {
            result[c] = tree.operate(op, rgb1[c] , rgb2[c]);
        }

        if (this.perceptual) {
            result = husl.fromRGB.apply(this, result);
            result[1] = result[1] / 100;
            result[2] = result[2] / 100;
        }
        else {
            result = chroma(_.map(result, denormalize)).hsl();
        }

        return new tree.Color(result, this.alpha, this.perceptual);
    },

    getComponents: function() {
        if (this.hsl !== null) {
            return { h: this.hsl[0] || 0, s: this.hsl[1], l: this.hsl[2], a: this.alpha, perceptual: this.perceptual }
        }
        return null;
    },

    round: function(value, decimals) {
        return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
    }
};

})(require('../tree'));
