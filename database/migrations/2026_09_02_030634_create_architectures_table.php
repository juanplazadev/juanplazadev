<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('architectures', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('tagline');
            $table->string('status');

            // Up and serving traffic - drives the pinging StatusDot.
            $table->boolean('active')->default(false);

            // These are living documents with no date to sort on, so display
            // order needs a column of its own rather than falling out of a
            // date the way the blog does.
            $table->unsignedInteger('position')->default(0);

            $table->json('stack');
            $table->json('links')->nullable();

            $table->text('body');
            $table->json('blocks')->nullable();
            $table->json('rendered')->nullable();

            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architectures');
    }
};
