### File storage sample

The application built in the [File storage](https://docs.nestjs.com/application/file-storage) tutorial, with [`@nestjs/storage`](https://github.com/nestjs/storage): the files of an online store for cat food and supplies.

- Staff upload product photos. `uploadToDisk()` checks the type and the size, and streams each photo onto the public `photos` disk. A product's new photo replaces the old one.
- Invoices are stored on the `private` disk the first time a customer asks for one. The customer gets a link that expires after five minutes.
- The warehouse's mobile app uploads photos straight to storage, with a signed upload URL. The API checks each upload before it makes it the product's photo.
- Both disks are folders on this machine, as in the tutorial.

The sample covers the tutorial's code and its photo test, on Express. Products and orders are kept in memory: the products `salmon-kibble-2kg` and `sisal-scratching-post`, and the orders `ord_1000` (paid) and `ord_1001` (not paid yet). A restart forgets which photo each product has, but not the files. The sample leaves out the page's Fastify notes and its production checklist, and it doesn't check who asks for an invoice, which a real app does. `src/storage/storage.config.ts` keeps the page's S3 branch, from [Use S3 or R2 in production](https://docs.nestjs.com/application/file-storage#use-s3-or-r2-in-production), which `STORAGE_DRIVER=s3` selects, but the sample runs on local disks only.

### What is where

| Path | Contents |
| --- | --- |
| `src/config/configuration.ts` | The configuration, read from environment variables |
| `src/storage/storage.config.ts` | `createStorageOptions()`: the `photos` and `private` disks, local or on S3 |
| `src/products/` | Photo uploads with `uploadToDisk()`, direct uploads with `signedUpload()`, and the photos served with `serveFile()` in development |
| `src/orders/`, `src/invoices/` | Invoices on the private disk, and their signed download links |
| `src/files/` | The local private disk's signed URLs: downloads with `serveSignedUrl()`, uploads with `receiveSignedUpload()` |
| `test/photos.e2e-spec.ts` | The tutorial's test, on in-memory disks |
| `try-it/` | The files that the [Try it](#try-it) steps upload |

### Installation

`npm install`

### Running

The disks are folders, so the app needs nothing else. Export a key for the private disk's signed URLs, and start the app on port 3000:

```bash
$ export STORAGE_SIGNING_KEY=$(openssl rand -hex 32)
$ npm run start
```

The disks are `storage/photos` and `storage/private`. Without `STORAGE_SIGNING_KEY`, or with a key shorter than 32 characters, the app doesn't start.

| Variable | Meaning |
| --- | --- |
| `STORAGE_SIGNING_KEY` | Signs the private disk's URLs: at least 32 characters, such as `openssl rand -hex 32` |
| `STORAGE_ROOT` | The folder that holds the disks' folders (`storage`) |
| `APP_URL` | Where the app is reachable, which its photo and signed URLs start with (`http://localhost:3000`) |
| `PORT` | The port to listen on (`3000`). Change `APP_URL` along with it |

### Try it

These are the steps of the tutorial's [Try it](https://docs.nestjs.com/application/file-storage#try-it) section, which shows each response. Run them in a second terminal, in `try-it/`, which has the files they upload: `kibble.png`, `scratching-post.jpg` and `notes.txt`. `--json` needs curl 7.82 or later, and the steps use [jq](https://jqlang.org).

`cd try-it`

Upload a photo. Then try a text file declared as an image, which the app refuses without storing it:

```bash
$ curl -F photo=@kibble.png localhost:3000/products/salmon-kibble-2kg/photo
$ curl -F 'photo=@notes.txt;type=image/png' localhost:3000/products/salmon-kibble-2kg/photo
```

Fetch a photo's headers:

```bash
$ PHOTO=$(curl -s -F photo=@kibble.png localhost:3000/products/salmon-kibble-2kg/photo | jq -r .photoUrl)
$ curl -sI "$PHOTO" | grep -iE '^(content-|cache-control|x-content)'
```

Get a signed link to an invoice, download it, and try the same link for another order. curl doesn't overwrite a file whose name comes from the server, so delete `invoice-ord_1000.pdf` before you download it again:

```bash
$ curl localhost:3000/orders/ord_1000/invoice
$ INVOICE=$(curl -s localhost:3000/orders/ord_1000/invoice | jq -r .url)
$ curl -sOJ "$INVOICE"
$ head -c 8 invoice-ord_1000.pdf
$ curl "${INVOICE/ord_1000/ord_1001}"
```

Finally, upload a photo the way the mobile app does. Ask for an upload URL, send the file there, and submit its key:

```bash
$ curl -s localhost:3000/products/sisal-scratching-post/photo/uploads --json "{\"contentType\":\"image/jpeg\",\"size\":$(wc -c < scratching-post.jpg)}" | tee upload.json | jq
$ curl -T scratching-post.jpg -H 'content-type: image/jpeg' "$(jq -r .url upload.json)"
$ curl -X PUT localhost:3000/products/sisal-scratching-post/photo --json "$(jq -c '{key}' upload.json)"
```

The files are in `storage/photos` and `storage/private`, as plain files: `storage/private/invoices/ord_1000.pdf` is the invoice. The `.nest-storage` folder in each holds temporary files during writes, and the metadata that a file name can't carry.

### Test

The tutorial's test replaces both disks with in-memory disks, so it needs no signing key and no files. The upload still goes through multer and `uploadToDisk()`, as it does in the app. vitest needs Node.js 22 or later:

`npm run test:e2e`
