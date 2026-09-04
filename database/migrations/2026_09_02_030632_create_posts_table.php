<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary');
            $table->json('tags');
            $table->unsignedTinyInteger('reading_minutes');

            // `body` is the markdown a human writes and the only editable
            // source. `blocks` holds the non-prose payloads it references by
            // key, and `rendered` is the interleaved output both are compiled
            // into on save - see App\Support\Content\BodyRenderer.
            $table->text('body');
            $table->json('blocks')->nullable();
            $table->json('rendered')->nullable();

            // Null is a draft. Indexed because every public read filters on it.
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
