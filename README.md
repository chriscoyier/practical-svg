# A Book Depart

### First…

`npm install`

## Then…

### Extract the Book Contents

Drop your .epub into the `./epub` directory and run `npm run extract`. 

Thanks to Jeff Eaton’s 「[DANCING QUEEN](https://github.com/eaton/dq)」, the contents of the .epub will get turned into Markdown and dropped into `_src/chapter` alongside all your images, while a `_data/meta.json` will be created with basic information—book title, your name, copyright information, ISBN, former publisher, and cover color. `_data/` will also contain JSON files with lists of all the extracted files, links in the copy, and the table of contents.

## And finally…

### Build the Dev Site

`npm start`

### Build the Production Site

`npm run production` or just `eleventy`

## Known Issues

Some maniacs (cough) used bold and italics in their code snippets. Unfortunately, the markup responsible for that formatting is going to come through as Markdown, which won’t be _interpreted_ as Markdown on account of being inside codeblocks. Those will have to be cleaned out manually.

Don’t forget to update all your icons and your social preview card thing. Those are all in `_src/_assets/img`.
