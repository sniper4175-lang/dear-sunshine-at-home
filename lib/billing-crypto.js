import {
    createCipheriv,
    createDecipheriv,
    randomBytes
} from 'node:crypto';


function getKey() {

    const raw =
        process.env
            .BILLING_ENCRYPTION_KEY;


    if (!raw) {

        throw new Error(
            'BILLING_ENCRYPTION_KEY가 설정되지 않았습니다.'
        );

    }


    const key =
        Buffer.from(
            raw,
            'base64'
        );


    if (
        key.length !==
        32
    ) {

        throw new Error(
            'BILLING_ENCRYPTION_KEY는 base64로 인코딩된 32바이트 키여야 합니다.'
        );

    }


    return key;
}


export function encryptBillingKey(
    plainText
) {

    const iv =
        randomBytes(
            12
        );


    const cipher =
        createCipheriv(
            'aes-256-gcm',
            getKey(),
            iv
        );


    const encrypted =
        Buffer.concat([
            cipher.update(
                String(
                    plainText
                ),
                'utf8'
            ),
            cipher.final()
        ]);


    const tag =
        cipher.getAuthTag();


    return [
        'v1',
        iv.toString(
            'base64url'
        ),
        tag.toString(
            'base64url'
        ),
        encrypted.toString(
            'base64url'
        )
    ].join(
        '.'
    );
}


export function decryptBillingKey(
    encryptedValue
) {

    const [
        version,
        ivValue,
        tagValue,
        cipherValue
    ] =
        String(
            encryptedValue || ''
        ).split(
            '.'
        );


    if (
        version !== 'v1' ||
        !ivValue ||
        !tagValue ||
        !cipherValue
    ) {

        throw new Error(
            '저장된 빌링키 형식이 올바르지 않습니다.'
        );

    }


    const decipher =
        createDecipheriv(
            'aes-256-gcm',
            getKey(),
            Buffer.from(
                ivValue,
                'base64url'
            )
        );


    decipher.setAuthTag(
        Buffer.from(
            tagValue,
            'base64url'
        )
    );


    const decrypted =
        Buffer.concat([
            decipher.update(
                Buffer.from(
                    cipherValue,
                    'base64url'
                )
            ),
            decipher.final()
        ]);


    return decrypted.toString(
        'utf8'
    );
}
