import { Form, Head } from '@inertiajs/react';

import ArchitectureController from '@/actions/App/Http/Controllers/Admin/ArchitectureController';
import BodyEditor from '@/components/admin/body-editor';
import Field from '@/components/admin/field';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';

type ArchitectureForm = {
    slug: string;
    title: string;
    tagline: string;
    status: string;
    active: boolean;
    position: number;
    stack: string;
    links: string;
    body: string;
    blocks: string;
    published: boolean;
};

const blank: ArchitectureForm = {
    slug: '',
    title: '',
    tagline: '',
    status: 'In development',
    active: false,
    position: 0,
    stack: '[\n    { "label": "Laravel", "icon": "laravel" }\n]',
    links: '',
    body: '',
    blocks: '',
    published: false,
};

export default function AdminArchitectureForm({
    architecture,
}: {
    architecture: ArchitectureForm | null;
}) {
    const values = architecture ?? blank;
    const editing = architecture !== null;

    return (
        <>
            <Head
                title={
                    editing
                        ? `Edit ${values.title}`
                        : 'New architecture write-up'
                }
            />

            <div className="max-w-3xl space-y-6 p-4">
                <Heading
                    title={editing ? 'Edit write-up' : 'New write-up'}
                    description="The body is markdown; diagrams and spec lists live in blocks."
                />

                <Form
                    {...(editing
                        ? ArchitectureController.update.form(values.slug)
                        : ArchitectureController.store.form())}
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
                                id="tagline"
                                label="Tagline"
                                hint="One line, under the title and on the index card."
                                error={errors.tagline}
                            >
                                <Textarea
                                    id="tagline"
                                    name="tagline"
                                    defaultValue={values.tagline}
                                    required
                                />
                            </Field>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <Field
                                    id="status"
                                    label="Status"
                                    hint="Free text - shown as a badge. eg. Live."
                                    error={errors.status}
                                >
                                    <Input
                                        id="status"
                                        name="status"
                                        defaultValue={values.status}
                                        required
                                    />
                                </Field>

                                <Field
                                    id="position"
                                    label="Position"
                                    hint="Lowest first. There is no date to sort on."
                                    error={errors.position}
                                >
                                    <Input
                                        id="position"
                                        name="position"
                                        type="number"
                                        min={0}
                                        defaultValue={values.position}
                                        required
                                    />
                                </Field>
                            </div>

                            <Field
                                id="stack"
                                label="Stack"
                                hint="JSON array of { label, icon }. Icons must be keys of resources/js/lib/icons.ts."
                                error={errors.stack}
                            >
                                <Textarea
                                    id="stack"
                                    name="stack"
                                    className="font-mono text-[13px]"
                                    defaultValue={values.stack}
                                    spellCheck={false}
                                    required
                                />
                            </Field>

                            <Field
                                id="links"
                                label="Links"
                                hint="JSON array of { label, href }. Off-site proof: the running app, the source. Leave empty for none."
                                error={errors.links}
                            >
                                <Textarea
                                    id="links"
                                    name="links"
                                    className="font-mono text-[13px]"
                                    defaultValue={values.links}
                                    spellCheck={false}
                                />
                            </Field>

                            <BodyEditor
                                body={values.body}
                                blocks={values.blocks}
                                errors={errors}
                            />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="active"
                                        name="active"
                                        value="1"
                                        defaultChecked={values.active}
                                    />
                                    <Label htmlFor="active">
                                        Active
                                        <span className="text-muted-foreground font-normal">
                                            - up and serving traffic, drives the
                                            pinging status dot
                                        </span>
                                    </Label>
                                </div>

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
                                            - a draft is a 404 for everyone but
                                            you
                                        </span>
                                    </Label>
                                </div>
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

AdminArchitectureForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Architecture', href: ArchitectureController.index() },
    ],
};
