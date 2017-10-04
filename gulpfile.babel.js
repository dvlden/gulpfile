import gulp from 'gulp';
import del from 'del';
import browserSync from 'browser-sync';
import runSequence from 'run-sequence';
import loadPlugins from 'gulp-load-plugins';

let DEV = true;
const VHOST = {
    'src': 'project.src',
    'dest': 'project.dest'
};

const $ = loadPlugins();
const RELOAD = browserSync.reload;

const BASE = {
    tmp: './.tmp/',
    src: './app/',
    dest: './public/'
};

var getPath = function ( name ) {
    return {
        tmp: BASE.tmp + name + '/',
        src: BASE.src + name + '/',
        dest: BASE.dest + name + '/'
    }
};

const PATH = {
    images: getPath('images'),
    styles: getPath('styles'),
    scripts: getPath('scripts')
};

const AUTOPREFIXER_CONFIG = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

const CSSNANO_CONFIG = {
    discardComments: {
        removeAllButFirst: true
    },
    discardUnused: false,
    autoprefixer: {
        add: true,
        browsers: AUTOPREFIXER_CONFIG
    }
};

const SASS_CONFIG = {
    outputStyle: 'expanded',
    precision: 10,
    errLogToConsole: true
};

const IMAGEMIN_CONFIG = {
    optimizationLevel: 4,
    progressive: true,
    interlaced: true,
    svgoPlugins: [{ cleanupIDs: false }]
};

const COPY_EXCLUDE = [
    BASE.src + '**/*',
    '!' + BASE.src + '.gitignore',
    '!' + BASE.src + '{styles,styles/**/*}',
    '!' + BASE.src + '{scripts,scripts/**/*}',
    '!' + BASE.src + '{images,images/**/*}',
    '!' + BASE.src + '{includes/cache,includes/cache/**/*'
];

const SCRIPTS_SEQUENCE = [
    PATH.scripts.src + 'plugins/*.js',
    PATH.scripts.src + 'app.js'
];

// Lint
gulp.task('lint', () =>
    gulp.src(PATH.scripts.src + '**/*.js')
        .pipe($.eslint())
        .pipe($.eslint.format())
        .pipe($.if(!browserSync.active, $.eslint.failOnError()))
        .pipe($.notify('Lint task complete.'))
);

// Optimise Image files
gulp.task('images', () =>
    gulp.src(PATH.images.src + '**/*.{jpg,png,gif,svg}')
        .pipe($.cache($.imagemin({ IMAGEMIN_CONFIG })))
        .pipe(gulp.dest(PATH.images.dest))
        .pipe($.notify({ onLast: true, message: () => 'Images task complete.'}))
);

// Copy all files at the root level (BASE.src)
gulp.task('copy', () =>
    gulp.src(COPY_EXCLUDE, { dot: true })
        .pipe($.newer(BASE.dest))
        .pipe(gulp.dest(BASE.dest))
        .pipe($.notify({ onLast: true, message: () => 'Copy task complete.'}))
);

// Handle SASS files
gulp.task('styles', () =>
    gulp.src(PATH.styles.src + '**/*.scss')
        .pipe($.newer(PATH.styles.dest))
        .pipe($.sourcemaps.init())
        .pipe($.sassGlob())
        .pipe($.sass(SASS_CONFIG))
        .pipe($.base64({ extensions: ['jpg', 'png', 'gif', 'svg'] }))
        .pipe($.if(!DEV, $.cssnano(CSSNANO_CONFIG)))
        .pipe($.if(DEV, $.sourcemaps.write()))
        .pipe($.rename({ suffix: '.min' }))
        .pipe(gulp.dest(DEV ? PATH.styles.tmp : PATH.styles.dest))
        .pipe($.notify({ onLast: true, message: () => 'Styles task complete.'}))
);

// Handle JS files
gulp.task('scripts', () =>
    gulp.src(SCRIPTS_SEQUENCE)
        .pipe($.newer(PATH.scripts.dest))
        .pipe($.sourcemaps.init())
        // .pipe( $.babel() )
        .pipe($.concat('app.js'))
        .pipe($.if(!DEV, $.stripDebug()))
        .pipe($.rename({ suffix: '.min' }))
        .pipe($.if(!DEV, $.uglify()))
        .pipe($.if(DEV, $.sourcemaps.write()))
        .pipe(gulp.dest(DEV ? PATH.scripts.tmp : PATH.scripts.dest))
        .pipe($.notify({ onLast: true, message: () => 'Scripts task complete.'}))
);

// Clean output directories and cache
gulp.task('clean', ['cache'], cb => del([BASE.dest, BASE.tmp], { dot: true }) );
gulp.task('cache', cb => $.cache.clearAll(cb));

// Watch for file changes and run server at the root level (BASE.src)
gulp.task('serve', ['scripts', 'styles'], () => {
    browserSync.init({
        proxy: VHOST.src,
        port: 5555,
        logPrefix: 'BaseApp',
        scrollProportionally: true,
        scrollThrottle: 60,
        reloadDelay: 200,
        notify: false
    })

    gulp.watch([BASE.src + '**/*.php'], RELOAD);
    gulp.watch([PATH.scripts.src + '**/*.js'], ['lint', 'scripts']);
    gulp.watch([PATH.styles.src + '**/*.scss'], ['styles', RELOAD]);
    gulp.watch([PATH.images.src + '**/*.{jpg,png,gif,svg}'], RELOAD);
});

gulp.task('serve:dist', ['default'], () =>
    browserSync.init({
        proxy: VHOST.dest,
        port: 5556,
        logPrefix: 'BaseApp',
        scrollProportionally: true,
        scrollThrottle: 60,
        reloadDelay: 200,
        notify: false
    })
);

gulp.task('default', ['clean'], cb => {
    DEV = false;
    runSequence(
        'styles',
        ['lint', 'scripts', 'images', 'copy'],
        cb
    );
});
