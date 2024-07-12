import { processBook } from '@eatonfyi/dq';
import jetpack from 'fs-jetpack';

const files = await jetpack.find('epub', { matching: '*.epub' });

files.forEach( async ( filePath ) => {
	await processBook( filePath, { 
		root: '.',
		data: '_src/_data',
		chapters: '_src/chapter',
		images: '_src/chapter/image',
	});
});
