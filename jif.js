#!/usr/bin/env node
const fs = require('fs');
const Canvas = require('canvas');

const argv = require('yargs')
	.scriptName('jif')
	.usage('$0 [args] <file>')
	.option('expanded', {
		description: 'Whether to use the expanded format',
		type: "boolean",
		alias: 'e',
	})
	.option('decode', {
		description: 'Decode a JIF to PNG',
		type: "boolean",
		alias: 'd',
	})
	.option('output', {
		description: 'Where to put the output',
		alias: 'o'
	})
	.positional('file', {
		describe: 'The file to decode',
		type: 'string',
		demandOption: true
	})
	.parse();


const filename = argv._[0]
if (!filename) {
	console.error("No file was specified.")
	process.exit(1);
}

if (!argv.decode) {
	if (!fs.existsSync(filename)) {
		console.error(`File ${filename} does not exist`);
		process.exit(1);
	} else if (!filename.endsWith('.png')) {
		console.error(`File ${filename} is not a PNG`);
		process.exit(1);
	}

	const img = Canvas.loadImage(filename).then(img => {
		const canvas = Canvas.createCanvas(img.width, img.height);
		const ctx = canvas.getContext('2d');

		ctx.drawImage(img, 0, 0);

		const jif = {
			width: img.width,
			height: img.height,
			pixels: []
		};

		for (let x = 0; x < img.width; x++) {
			for (let y = 0; y < img.height; y++) {
				const pixel = ctx.getImageData(x, y, 1, 1).data;
				jif.pixels.push(!argv.expanded ? {
					p: `${x},${y}`,
					c: `${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`
				} : {
					x,
					y,
					r: pixel[0],
					g: pixel[1],
					b: pixel[2],
					a: pixel[3]
				});
			}
		}

		const out = argv.output || filename.replace(/\.[a-zA-Z]{2,4}$/, '.jif');
		fs.writeFileSync(out, argv.expanded ? JSON.stringify(jif, null, 2) : JSON.stringify(jif));
		console.log(`Wrote ${out}`);
	});
} else {
	if (!fs.existsSync(filename)) {
		console.error(`File ${filename} does not exist`);
		process.exit(1);
	} else if (!filename.endsWith('.jif')) {
		console.error(`File ${filename} is not a JIF`);
		process.exit(1);
	}

	try {
		jif = JSON.parse(fs.readFileSync(filename));

		// Validation
		if (!jif.width || !jif.height || !jif.pixels) throw new Error();
		if (!jif.pixels.map(p => !argv.expanded ? (p.p && p.c ? true : false) : (p.x && p.y && p.r && p.g && p.b && p.a ? true : false)).includes(true)) throw new Error();
	} catch (e) {
		console.error(`File ${filename} is not a valid JIF! If it uses the expanded format, make sure to append the argument.`);
		process.exit(1);
	}

	const canvas = Canvas.createCanvas(jif.width, jif.height);
	const ctx = canvas.getContext('2d');

	for (const pixel of jif.pixels) {
		if (!argv.expanded) {
			const [r, g, b, a] = pixel.c.split(',').map(c => parseInt(c));
			ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
			ctx.fillRect(pixel.p.split(',')[0], pixel.p.split(',')[1], 1, 1);
			continue;
		} else {
			ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a})`;
			ctx.fillRect(pixel.x, pixel.y, 1, 1);
		}
	}

	const out = argv.output || filename.replace(/\.[a-zA-Z]{2,4}$/, '.png');
	fs.writeFileSync(out, canvas.toBuffer('image/png'));
	console.log(`Wrote ${out}`);
}