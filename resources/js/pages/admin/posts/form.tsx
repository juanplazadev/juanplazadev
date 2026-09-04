import { Form, Head } from '@inertiajs/react';

import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import BodyEditor from '@/components/admin/body-editor';
import Field from '@/components/admin/field';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';

type PostForm = {
    slug: string;
    title: string;
    summary: string;
    tags: string;
    reading_minutes: number;
    body: string;
    blocks: string;
    published: boolean;
};

const blank: PostForm = {
    slug: '',
    title: '',
    summary: '',
    tags: '',
    reading_minutes: 5,
    body: '',
    blocks: '',
    published: false,
};

export default function AdminPostForm({ post }: { post: PostForm | null }) {
    const values = post ?? blank;
    const editing = post !== null;

    return (
        <>
            <Head title={editing ? `Edit ${values.title}` : 'New post'} />

            <div className="max-w-3xl space-y-6 p-4">
                <Heading
                    title={editing ? 'Edit post' : 'New post'}
                    description="The body is markdown and is compiled on save."
                />

                <Form
                    {...(editing
                        ? PostController.update.form(values.slug)
                        : PostController.store.form())}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <Field
                                id="title"
                                label="Title"
                                error={errors.title}
                            >
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={values.title}
                                    required
                                />
                            </Field>

                            <Field
                                id="slug"
                                label="Slug"
                                hint="The public URL. Lowercase letters, numbers and hyphens."
                                error={errors.slug}
                            >
                                <Input
                                    id="slug"
                                    name="slug"
                                    defaultValue={values.slug}
                                    required
                                />
                            </Field>

                            <Field
                                id="summary"
                                label="Summary"
                                hint="Shown on the index card and used as the page description."
                                error={errors.summary}
                            >
                                <Textarea
                                    id="summary"
                                    name="summary"
                                    defaultValue={values.summary}
                                    required
                                />
                            </Field>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <Field
                                    id="tags"
                                    label="Tags"
                                    hint="Comma separated."
                                    error={errors.tags}
                                >
                                    <Input
                                        id="tags"
                                        name="tags"
                                        defaultValue={values.tags}
                                    />
                                </Field>

                                <Field
                                    id="reading_minutes"
                                    label="Reading minutes"
                                    error={errors.reading_minutes}
                                >
                                    <Input
                                        id="reading_minutes"
                                        name="reading_minutes"
                                        type="number"
                                        min={1}
                                        max={120}
                                        defaultValue={values.reading_minutes}
                                        required
                                    />
                                </Field>
                            </div>

                            <BodyEditor
                                body={values.body}
                                blocks={values.blocks}
                                errors={errors}
                            />

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="published"
                                    name="published"
                                    value="1"
                                    defaultChecked={values.published}
                                />
                                <Label htmlFor="published">
                                    Published
                                    <span className="text-muted-foreground font-normal">
                                        - a draft is a 404 for everyone but you
                                    </span>
                                </Label>
                            </div>

                            <Button type="submit" disabled={processing}>
                                {editing ? 'Save' : 'Create'}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

AdminPostForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: PostController.index() },
    ],
};
