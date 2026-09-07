<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->uuid()->unique();
            $table->string('email')->index();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->boolean('turnstile_success')->nullable();
            $table->json('turnstile_errors')->nullable();
            $table->string('message_id')->nullable()->index();
            $table->timestamp('email_sent_at')->nullable();
            $table->boolean('email_delivered')->default(false);
            $table->timestamp('email_delivered_at')->nullable();
            $table->string('failure_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_deliveries');
    }
};
